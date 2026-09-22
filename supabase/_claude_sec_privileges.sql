-- =====================================================================
-- FAILLE CRITIQUE — colonnes de privilège modifiables par le client
-- =====================================================================
-- Constat (vérifié en production le 22/09/2026 avec un compte gratuit
-- fraîchement créé et la seule clé anon) : les policies RLS sont
-- *par ligne*, jamais *par colonne*. « Je peux modifier mon profil »
-- voulait donc dire « je peux modifier N'IMPORTE QUELLE colonne de mon
-- profil », y compris celles qui décident de ce que j'ai payé.
--
-- Ce qu'un simple membre pouvait faire, en une requête :
--   • profiles.plan_type   = 'business'  → formule à 120 €/mois gratuite
--   • profiles.is_admin    = true        → accès admin complet (!!)
--   • profiles.kyc_status  = 'verified'  → badge « vérifié » usurpé
--   • profiles.stripe_*                  → identifiants Stripe falsifiés
--   • INSERT listing_unlocks             → déblocage à 5 € gratuit, sur
--                                          n'importe quelle annonce
--   • listings.boosted_until / is_premium → mise en avant à 10 € gratuite
--
-- Principe du correctif : ces colonnes ne sont plus JAMAIS écrites par
-- l'application. Seuls le webhook Stripe et l'éditeur SQL (service_role,
-- ou connexion directe sans JWT) peuvent les changer. Les triggers
-- *ignorent silencieusement* la tentative au lieu d'échouer : aucun
-- écran existant ne casse, la valeur est simplement conservée.
--
-- À coller dans Supabase Studio > SQL Editor. Idempotent.
-- Vérifier ensuite avec : node scripts/audit-privileges.mjs
-- =====================================================================

-- Appelant de confiance : service_role, ou aucune requête PostgREST
-- (éditeur SQL, cron, fonction edge en service_role).
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  RETURN COALESCE(claims ->> 'role', 'service_role') = 'service_role';
END;
$$;

-- ---------------------------------------------------------------------
-- 1) profiles — formule, rôle admin, KYC, identifiants Stripe
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean := false;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p WHERE p.id = caller;

  -- Jamais modifiables depuis l'application, par qui que ce soit.
  -- (Nommer un admin ou changer une formule se fait en SQL / par le webhook.)
  NEW.is_admin               := OLD.is_admin;
  NEW.plan_type              := OLD.plan_type;
  NEW.stripe_customer_id     := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;

  -- Niveau de qualification du repreneur : décidé par un admin
  IF NEW.buyer_level IS DISTINCT FROM OLD.buyer_level AND NOT caller_is_admin THEN
    NEW.buyer_level := OLD.buyer_level;
  END IF;

  -- KYC : le membre peut seulement DEMANDER la vérification (none/rejected
  -- → pending). C'est l'admin qui valide ou refuse.
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF caller_is_admin THEN
      NULL;
    ELSIF caller = OLD.id
      AND COALESCE(OLD.kyc_status, 'none') IN ('none', 'rejected')
      AND NEW.kyc_status = 'pending' THEN
      NULL;
    ELSE
      NEW.kyc_status := OLD.kyc_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- L'ancien trigger ne couvrait que buyer_level : il est absorbé par celui-ci.
DROP TRIGGER IF EXISTS trg_protect_buyer_level ON public.profiles;

-- Création de profil : le client ne choisit pas ses privilèges non plus
-- (l'onboarding fait un upsert, donc un INSERT au premier passage).
CREATE OR REPLACE FUNCTION public.protect_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  NEW.is_admin               := false;
  NEW.plan_type              := 'free';
  NEW.kyc_status             := COALESCE(NEW.kyc_status, 'none');
  IF NEW.kyc_status <> 'none' THEN NEW.kyc_status := 'none'; END IF;
  NEW.buyer_level            := NULL;
  NEW.stripe_customer_id     := NULL;
  NEW.stripe_subscription_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_insert ON public.profiles;
CREATE TRIGGER trg_protect_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_insert();

-- ---------------------------------------------------------------------
-- 2) listing_unlocks — un déblocage ne s'achète que par un paiement
-- ---------------------------------------------------------------------
-- La policy « Users manage their unlocks » (FOR ALL) laissait le client
-- créer lui-même la ligne qui prouve qu'il a payé. On ne garde que la
-- lecture : l'écriture appartient au webhook Stripe (service_role, qui
-- contourne la RLS par nature).
DROP POLICY IF EXISTS "Users manage their unlocks" ON public.listing_unlocks;

DROP POLICY IF EXISTS "Déblocages : lecture des siens" ON public.listing_unlocks;
CREATE POLICY "Déblocages : lecture des siens"
  ON public.listing_unlocks FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3) listings / projects / search_ads — mise en avant et badge premium
-- ---------------------------------------------------------------------
-- Une fonction par table, volontairement : un trigger générique qui lirait
-- NEW.verification_status sur `listings` échoue à l'exécution (la colonne
-- n'existe pas). Pour du code de sécurité, explicite vaut mieux qu'astucieux.

CREATE OR REPLACE FUNCTION public.protect_listing_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.boosted_until := NULL;   -- la mise en avant s'achète (10 €)
    NEW.is_premium    := false;  -- le badge premium accompagne un paiement
  ELSE
    NEW.boosted_until := OLD.boosted_until;
    NEW.is_premium    := OLD.is_premium;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_project_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean := false;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.boosted_until       := NULL;
    NEW.verification_status := 'non_soumis';
    RETURN NEW;
  END IF;

  NEW.boosted_until := OLD.boosted_until;

  -- La vérification d'un projet est prononcée par un admin ; le porteur peut
  -- seulement la demander.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
    FROM public.profiles p WHERE p.id = auth.uid();

    IF caller_is_admin THEN
      NULL;
    ELSIF COALESCE(OLD.verification_status, 'non_soumis') IN ('non_soumis', 'rejete')
      AND NEW.verification_status = 'en_attente' THEN
      NULL;
    ELSE
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_search_ad_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.boosted_until := NULL;
  ELSE
    NEW.boosted_until := OLD.boosted_until;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_boost_listings ON public.listings;
DROP TRIGGER IF EXISTS trg_protect_listing_privileges ON public.listings;
CREATE TRIGGER trg_protect_listing_privileges
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_privileges();

DROP TRIGGER IF EXISTS trg_protect_boost_projects ON public.projects;
DROP TRIGGER IF EXISTS trg_protect_project_privileges ON public.projects;
CREATE TRIGGER trg_protect_project_privileges
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_privileges();

DROP TRIGGER IF EXISTS trg_protect_boost_search_ads ON public.search_ads;
DROP TRIGGER IF EXISTS trg_protect_search_ad_privileges ON public.search_ads;
CREATE TRIGGER trg_protect_search_ad_privileges
  BEFORE INSERT OR UPDATE ON public.search_ads
  FOR EACH ROW EXECUTE FUNCTION public.protect_search_ad_privileges();

-- L'ancienne fonction générique est remplacée par les trois ci-dessus.
DROP FUNCTION IF EXISTS public.protect_boost_columns();
