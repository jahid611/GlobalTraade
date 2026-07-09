-- ============================================================
-- ESPACE PARTENAIRE (banques, courtiers, avocats, experts-comptables)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - profiles.partner_type : banque / courtier / avocat / comptable
--  - dossiers : « Proposer un dossier » — 3 types :
--      annonce_client       (un cabinet dépose une entreprise pour un client)
--      projet_reprise       (un client cherche à acheter : budget, secteur…)
--      demande_financement  (envoyée aux banques APRÈS accord vendeur/repreneur)
--    Champs spécifiques dans `fields` (jsonb), documents en storage privé.
--    Le partenaire choisit qui peut consulter (visibility).
--  - appointments : petit agenda de rendez-vous des partenaires.
-- ============================================================

-- 1) Type de partenaire
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_type text
  CHECK (partner_type IS NULL OR partner_type IN ('banque', 'courtier', 'avocat', 'comptable'));

-- 2) Dossiers
CREATE TABLE IF NOT EXISTS public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('annonce_client', 'projet_reprise', 'demande_financement')),
  title text NOT NULL,
  client_name text,
  client_email text,
  description text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'accepte', 'refuse', 'cloture')),
  visibility text NOT NULL DEFAULT 'prive' CHECK (visibility IN ('prive', 'partenaires', 'membres')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossiers_partner ON public.dossiers(partner_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_visibility ON public.dossiers(visibility) WHERE visibility <> 'prive';

ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners manage their dossiers" ON public.dossiers;
CREATE POLICY "Partners manage their dossiers"
  ON public.dossiers FOR ALL
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- Visibilité contrôlée par le partenaire :
--  'partenaires' -> visible des autres partenaires (banques ne voient les
--                   demandes de financement qu'une fois acceptées)
--  'membres'     -> visible de tout membre connecté
DROP POLICY IF EXISTS "Shared dossiers are readable" ON public.dossiers;
CREATE POLICY "Shared dossiers are readable"
  ON public.dossiers FOR SELECT
  USING (
    partner_id = auth.uid()
    OR (
      visibility = 'membres'
      AND status <> 'brouillon'
      AND (type <> 'demande_financement' OR status IN ('accepte', 'cloture'))
    )
    OR (
      visibility = 'partenaires'
      AND status <> 'brouillon'
      AND (type <> 'demande_financement' OR status IN ('accepte', 'cloture'))
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_type IS NOT NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

CREATE OR REPLACE FUNCTION public.touch_dossier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_dossier ON public.dossiers;
CREATE TRIGGER trg_touch_dossier BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_dossier();

-- 3) Rendez-vous
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  with_name text,
  notes text,
  starts_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_organizer ON public.appointments(organizer_id, starts_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their appointments" ON public.appointments;
CREATE POLICY "Users manage their appointments"
  ON public.appointments FOR ALL
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- 4) Bucket privé pour les pièces des dossiers
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossiers', 'dossiers', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Partners upload dossier files" ON storage.objects;
CREATE POLICY "Partners upload dossier files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Partners read their dossier files" ON storage.objects;
CREATE POLICY "Partners read their dossier files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Partners delete their dossier files" ON storage.objects;
CREATE POLICY "Partners delete their dossier files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);
