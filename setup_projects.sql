-- ============================================================
--  PROJECTS HUB — Table principale
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Infos générales
  title             text NOT NULL,
  tagline           text,
  description       text NOT NULL,
  category          text NOT NULL,          -- ex: Tech, Agriculture, Santé...
  stage             text NOT NULL DEFAULT 'idea',  -- idea | prototype | mvp | growth | scale
  country           text,
  city              text,
  website_url       text,
  cover_image_url   text,

  -- Types d'aide recherchée (multi-select stocké en array)
  help_types        text[] DEFAULT '{}',    -- 'financial','human','material','expertise','network'

  -- Aide FINANCIÈRE
  financial_needed  boolean DEFAULT false,
  budget_min        numeric(15,2),
  budget_max        numeric(15,2),
  budget_currency   text DEFAULT 'EUR',
  investment_type   text,                   -- grant | loan | equity | donation | revenue_share
  equity_offered    numeric(5,2),           -- % proposé si equity

  -- Aide HUMAINE
  human_needed      boolean DEFAULT false,
  team_roles        jsonb DEFAULT '[]',     -- [{title, skills, type: full|part|volunteer, count}]

  -- Aide MATÉRIELLE
  material_needed   boolean DEFAULT false,
  material_items    jsonb DEFAULT '[]',     -- [{name, quantity, estimated_value, urgent}]

  -- Aide EXPERTISE
  expertise_needed  boolean DEFAULT false,
  expertise_domains text[] DEFAULT '{}',

  -- Aide RÉSEAU
  network_needed    boolean DEFAULT false,

  -- Métriques & visibilité
  view_count        integer DEFAULT 0,
  interest_count    integer DEFAULT 0,
  is_published      boolean DEFAULT true,
  is_urgent         boolean DEFAULT false,
  deadline          date,

  -- Timestamps
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Suivi des vues (1 vue unique par utilisateur connecté)
CREATE TABLE IF NOT EXISTS public.project_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(project_id, viewer_id)
);

-- Intérêts / candidatures sur un projet
CREATE TABLE IF NOT EXISTS public.project_interests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  help_type   text NOT NULL,    -- financial | human | material | expertise | network
  message     text,
  status      text DEFAULT 'pending',  -- pending | accepted | rejected
  created_at  timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id, help_type)
);

-- ============================================================
--  RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

-- Nettoyage des politiques existantes pour éviter les erreurs au re-run
DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
DROP POLICY IF EXISTS "projects_owner_all" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_auth" ON public.projects;
DROP POLICY IF EXISTS "interests_public_read" ON public.project_interests;
DROP POLICY IF EXISTS "interests_insert_auth" ON public.project_interests;
DROP POLICY IF EXISTS "interests_owner_update" ON public.project_interests;
DROP POLICY IF EXISTS "views_insert_auth" ON public.project_views;
DROP POLICY IF EXISTS "views_owner_read" ON public.project_views;

-- Tout le monde peut lire les projets publiés
CREATE POLICY "projects_public_read" ON public.projects
  FOR SELECT USING (is_published = true);

-- Le propriétaire voit tous ses projets
CREATE POLICY "projects_owner_all" ON public.projects
  FOR ALL USING (auth.uid() = owner_id);

-- Utilisateur connecté peut créer
CREATE POLICY "projects_insert_auth" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Intérêts
CREATE POLICY "interests_public_read" ON public.project_interests
  FOR SELECT USING (true);

CREATE POLICY "interests_insert_auth" ON public.project_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interests_owner_update" ON public.project_interests
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

-- Vues
CREATE POLICY "views_insert_auth" ON public.project_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "views_owner_read" ON public.project_views
  FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id));

-- FIX: Autoriser la suppression des messages pour permettre la suppression des conversations
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages" ON public.messages 
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================
--  Triggers & Functions
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction pour incrémenter le compteur de vues de façon atomique
CREATE OR REPLACE FUNCTION handle_project_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects 
  SET view_count = view_count + 1 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_project_views ON public.project_views;
CREATE TRIGGER trg_increment_project_views
  AFTER INSERT ON public.project_views
  FOR EACH ROW EXECUTE FUNCTION handle_project_view();

-- Ajouter project_id aux tables messages et tasks pour supporter les conversations de projet
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE public.messages ALTER COLUMN listing_id DROP NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'project_id') THEN
      ALTER TABLE public.messages ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'due_diligence_tasks') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'due_diligence_tasks' AND column_name = 'listing_id') THEN
      ALTER TABLE public.due_diligence_tasks ALTER COLUMN listing_id DROP NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'due_diligence_tasks' AND column_name = 'project_id') THEN
      ALTER TABLE public.due_diligence_tasks ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
