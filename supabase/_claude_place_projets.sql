-- ============================================================
-- PLACE PROJETS : fiche de financement, vérification, accès complet
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - projects : champs de financement (apport personnel, utilisation
--    des fonds, CA actuel/prévisionnel, financements recherchés) +
--    statut de vérification (l'équipe vérifie avant mise en avant).
--  - project_access_requests : un membre/partenaire demande l'accès
--    complet ; le porteur accepte ou refuse (accès gratuit pour les
--    partenaires si accepté).
--  - project_private : business plan + prévisionnel du porteur,
--    visibles uniquement du porteur et des demandes acceptées.
-- ============================================================

-- 1) Fiche de financement
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS apport_personnel text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funds_usage text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revenue_current text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revenue_forecast text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS financing_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'non_soumis'
  CHECK (verification_status IN ('non_soumis', 'en_attente', 'verifie', 'rejete'));

-- Seul un admin peut accorder/refuser la vérification ;
-- le porteur peut seulement soumettre (en_attente).
CREATE OR REPLACE FUNCTION public.protect_project_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      IF NEW.verification_status <> 'en_attente' OR OLD.verification_status IN ('verifie') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_project_verification ON public.projects;
CREATE TRIGGER trg_protect_project_verification
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_verification();

-- 2) Demandes d'accès complet
CREATE TABLE IF NOT EXISTS public.project_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, requester_id)
);

ALTER TABLE public.project_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters manage their requests" ON public.project_access_requests;
CREATE POLICY "Requesters manage their requests"
  ON public.project_access_requests FOR ALL
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Owners see and answer requests" ON public.project_access_requests;
CREATE POLICY "Owners see and answer requests"
  ON public.project_access_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners update requests" ON public.project_access_requests;
CREATE POLICY "Owners update requests"
  ON public.project_access_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

-- 3) Dossier privé (business plan / prévisionnel)
CREATE TABLE IF NOT EXISTS public.project_private (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  business_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their private file" ON public.project_private;
CREATE POLICY "Owners manage their private file"
  ON public.project_private FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Accepted requesters read the private file" ON public.project_private;
CREATE POLICY "Accepted requesters read the private file"
  ON public.project_private FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_access_requests req
      WHERE req.project_id = project_private.project_id
        AND req.requester_id = auth.uid()
        AND req.status = 'accepted'
    )
  );
