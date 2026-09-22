-- Reconstitution minimale de l'environnement Supabase pour tester les
-- politiques de sécurité en local, sans toucher à la production.
-- Ne contient que ce dont les tests ont besoin : les rôles, auth.uid(),
-- et les tables portant des colonnes de privilège.

CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- auth.uid() lit le « sub » du JWT, exactement comme chez Supabase
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  bio text,
  phone text,
  plan_type text NOT NULL DEFAULT 'free',
  is_admin boolean NOT NULL DEFAULT false,
  kyc_status text NOT NULL DEFAULT 'none',
  buyer_level text,
  stripe_customer_id text,
  stripe_subscription_id text,
  target_sectors text,
  email_alerts boolean NOT NULL DEFAULT true,
  onboarding_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  price numeric,
  is_premium boolean NOT NULL DEFAULT false,
  boosted_until timestamptz,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  boosted_until timestamptz,
  verification_status text NOT NULL DEFAULT 'non_soumis'
);

CREATE TABLE IF NOT EXISTS public.search_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text,
  boosted_until timestamptz
);

CREATE TABLE IF NOT EXISTS public.listing_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

-- Les policies telles qu'elles étaient en production : permissives par ligne,
-- aveugles aux colonnes. C'est précisément ce que les tests doivent mettre en
-- défaut avant correctif.
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_ads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- En production, un admin peut modifier n'importe quel profil (validation KYC,
-- niveau de qualification). On reproduit cette policy, sinon les tests admin
-- ne mordent sur rien.
--
-- Le test d'appartenance passe par une fonction SECURITY DEFINER : une policy
-- SUR profiles qui interroge profiles en ligne provoque une récursion infinie
-- (« infinite recursion detected in policy »).
CREATE OR REPLACE FUNCTION public.caller_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT a.is_admin FROM public.profiles a WHERE a.id = auth.uid()), false)
$$;

DROP POLICY IF EXISTS p_profiles_admin_update ON public.profiles;
CREATE POLICY p_profiles_admin_update ON public.profiles FOR UPDATE USING (public.caller_is_admin());
DROP POLICY IF EXISTS p_profiles_admin_select ON public.profiles;
CREATE POLICY p_profiles_admin_select ON public.profiles FOR SELECT USING (public.caller_is_admin());

DROP POLICY IF EXISTS p_profiles_insert ON public.profiles;
CREATE POLICY p_profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS p_listings_all ON public.listings;
CREATE POLICY p_listings_all ON public.listings FOR ALL USING (true) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS p_projects_all ON public.projects;
CREATE POLICY p_projects_all ON public.projects FOR ALL USING (true) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS p_search_ads_all ON public.search_ads;
CREATE POLICY p_search_ads_all ON public.search_ads FOR ALL USING (true) WITH CHECK (owner_id = auth.uid());

-- Nom repris À L'IDENTIQUE de la production : c'est cette policy que le
-- correctif supprime, le test ne vaut que si elle porte le même nom.
DROP POLICY IF EXISTS "Users manage their unlocks" ON public.listing_unlocks;
CREATE POLICY "Users manage their unlocks" ON public.listing_unlocks FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
