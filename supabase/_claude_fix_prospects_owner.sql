-- ============================================================
-- FIX CRM — erreur RLS « new row violates row-level security
-- policy for table "prospects" » à l'ajout d'une entreprise.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
-- Cause : le client pouvait envoyer created_by = null (id récupéré
-- via un appel réseau qui échoue). La policy exige created_by =
-- auth.uid(), donc la ligne était rejetée.
--
-- Correctif serveur (indépendant du code front) : created_by est
-- rempli avec l'utilisateur courant dès qu'il arrive vide, qu'il
-- soit omis (DEFAULT) ou explicitement null (TRIGGER).
-- ============================================================

-- Filet 1 : valeur par défaut si la colonne est omise
ALTER TABLE public.prospects ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Filet 2 : trigger qui couvre aussi le cas created_by = null explicite
CREATE OR REPLACE FUNCTION public.set_prospect_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_prospect_owner ON public.prospects;
CREATE TRIGGER trg_set_prospect_owner
  BEFORE INSERT ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_prospect_owner();
