-- =====================================================================
-- CRM DE PROSPECTION — fiche complète, historique, tâches
-- =====================================================================
-- Le « CRM » se résumait à un statut, un email et une note par entreprise.
-- Ce patch lui donne ce qu'un vrai CRM tient à jour :
--   - la fiche : téléphone, fonction du contact, site, étiquettes, priorité,
--     valeur estimée de l'affaire, prochaine action et sa date ;
--   - l'historique de tout ce qui s'est passé avec un prospect (notes, appels,
--     emails, rendez-vous, changements d'étape) ;
--   - les tâches à faire (relancer le…, rappeler…), avec échéance.
--
-- Chaque membre ne voit et ne modifie que SES prospects, activités et tâches.
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) La fiche prospect
-- ---------------------------------------------------------------------
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS contact_role text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS estimated_value numeric;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS next_action_at timestamptz;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS next_action_label text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_priority_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_priority_check
  CHECK (priority IN ('low', 'normal', 'high'));
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_estimated_value_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_estimated_value_check
  CHECK (estimated_value IS NULL OR estimated_value >= 0);

CREATE INDEX IF NOT EXISTS idx_prospects_owner_status ON public.prospects (created_by, status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_action ON public.prospects (created_by, next_action_at)
  WHERE next_action_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2) L'historique : tout ce qui s'est passé avec un prospect
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospect_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- note : remarque libre · call : appel · email : email envoyé ·
  -- meeting : rendez-vous · status : changement d'étape · task : tâche
  -- terminée · system : événement automatique (ajout au CRM…)
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'status', 'task', 'system')),
  content text CHECK (content IS NULL OR char_length(content) <= 5000),
  -- détails propres au type (ex. { "from": "contacte", "to": "reponse" })
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect ON public.prospect_activities (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_user ON public.prospect_activities (user_id, created_at DESC);

ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

-- On n'écrit que sur SES prospects, et en son nom.
DROP POLICY IF EXISTS "Activités : les siennes" ON public.prospect_activities;
CREATE POLICY "Activités : les siennes"
  ON public.prospect_activities FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.prospects p WHERE p.id = prospect_id AND p.created_by = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 3) Les tâches : ce qu'il reste à faire, et pour quand
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospect_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_tasks_prospect ON public.prospect_tasks (prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_tasks_due ON public.prospect_tasks (user_id, due_at) WHERE done_at IS NULL;

ALTER TABLE public.prospect_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tâches : les siennes" ON public.prospect_tasks;
CREATE POLICY "Tâches : les siennes"
  ON public.prospect_tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.prospects p WHERE p.id = prospect_id AND p.created_by = auth.uid())
  );

-- Le visiteur anonyme n'a rien à faire ici.
REVOKE ALL ON public.prospect_activities FROM anon;
REVOKE ALL ON public.prospect_tasks FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
