-- ============================================================
-- PROFILS ACHETEURS TYPÉS + NIVEAUX DE QUALIFICATION
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - buyer_type : repreneur individuel / entreprise / investisseur
--  - Critères de reprise : budget (target_budget, existant), apport,
--    secteurs (target_sectors, existant), localisation (target_geo,
--    existant), CA recherché, expérience, ambitions (texte libre).
--  - buyer_level : niveaux de crédibilité affichés en badges :
--      profil_cree       -> coordonnées vérifiées (défaut)
--      qualifie          -> projet et budget validés (par l'équipe)
--      finance_verifie   -> apport ou accord bancaire contrôlé
--    Seuls les admins peuvent faire évoluer ce niveau.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buyer_type text
  CHECK (buyer_type IS NULL OR buyer_type IN ('individuel', 'entreprise', 'investisseur'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buyer_level text NOT NULL DEFAULT 'profil_cree'
  CHECK (buyer_level IN ('profil_cree', 'qualifie', 'finance_verifie'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apport text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_revenue text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ambitions text;

-- Seul un admin peut modifier le niveau de qualification
CREATE OR REPLACE FUNCTION public.protect_buyer_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_level IS DISTINCT FROM OLD.buyer_level THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      NEW.buyer_level := OLD.buyer_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_buyer_level ON public.profiles;
CREATE TRIGGER trg_protect_buyer_level
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_buyer_level();

-- Badges publics (rassurer les vendeurs sur la crédibilité des repreneurs)
CREATE OR REPLACE VIEW public.buyer_badges AS
SELECT id, buyer_type, buyer_level, kyc_status
FROM public.profiles;

GRANT SELECT ON public.buyer_badges TO authenticated, anon;
