-- ============================================================
-- MONÉTISATION V3 — à coller dans Supabase Studio > SQL Editor
-- (idempotent, rejouable sans risque).
--
-- Formules :
--   free     : publication gratuite (1 annonce active toutes
--              catégories confondues), prix + photos seulement,
--              pas de messagerie, pas d'analyses, pas de CRM.
--   pro      : 70 €/mois — accès complet aux annonces et analyses,
--              20 nouveaux contacts/mois, CRM individuel,
--              prospection limitée, 5 annonces actives.
--   business : 120 €/mois — tout illimité + prospection APE
--              (20 entreprises contactées/mois puis 2 €/contact).
--
-- À l'acte :
--   listing_unlocks : déblocage d'une annonce précise à 5 €
--     (contenu complet + messagerie avec l'auteur + analyses).
--   boosted_until   : mise en avant 10 € (30 jours en tête de liste)
--     sur les annonces, projets et recherches d'entreprise.
--
--   listings.share_financials : le vendeur autorise (ou non) le
--     partage du CA / EBITDA aux membres ayant l'accès complet.
-- ============================================================

-- 1) Plans : free / pro / business (migration premium -> pro)
-- La colonne plan_type peut ne pas exister encore (jamais créée par un patch
-- précédent) -> on la crée d'abord, puis on migre les valeurs.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text;
UPDATE public.profiles SET plan_type = 'pro' WHERE plan_type = 'premium';
UPDATE public.profiles SET plan_type = 'free' WHERE plan_type IS NULL OR plan_type NOT IN ('free', 'pro', 'business');
ALTER TABLE public.profiles ALTER COLUMN plan_type SET DEFAULT 'free';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'business'));

-- L'ancienne synchronisation « premium vendeur » (is_premium suivait le
-- plan) est remplacée par la mise en avant payante par annonce.
DROP TRIGGER IF EXISTS trg_sync_listing_premium ON public.listings;
DROP TRIGGER IF EXISTS trg_sync_owner_listings_premium ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_listing_premium();
DROP FUNCTION IF EXISTS public.sync_owner_listings_premium();

-- 2) Déblocage ponctuel 5 € par annonce / projet / recherche
CREATE TABLE IF NOT EXISTS public.listing_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('listing', 'project', 'search_ad')),
  target_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_unlocks_user ON public.listing_unlocks(user_id);

ALTER TABLE public.listing_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their unlocks" ON public.listing_unlocks;
CREATE POLICY "Users manage their unlocks"
  ON public.listing_unlocks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- L'auteur d'une annonce peut savoir qui l'a débloquée
DROP POLICY IF EXISTS "Owners see unlocks on their listings" ON public.listing_unlocks;
CREATE POLICY "Owners see unlocks on their listings"
  ON public.listing_unlocks FOR SELECT
  USING (
    (target_type = 'listing' AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = target_id AND l.owner_id = auth.uid()))
    OR (target_type = 'project' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = target_id AND p.owner_id = auth.uid()))
    OR (target_type = 'search_ad' AND EXISTS (SELECT 1 FROM public.search_ads s WHERE s.id = target_id AND s.owner_id = auth.uid()))
  );

-- 3) Mise en avant 10 € (30 jours) — annonces, projets, recherches
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE public.search_ads ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_listings_boosted ON public.listings(boosted_until) WHERE boosted_until IS NOT NULL;

-- 4) Autorisation vendeur pour le partage des données financières
--    (cochée par défaut à la publication, le vendeur peut refuser)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS share_financials boolean NOT NULL DEFAULT true;

-- 5) Prospection APE (Business) : 20 entreprises contactées / mois,
--    puis 2 € par contact supplémentaire
CREATE TABLE IF NOT EXISTS public.prospection_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  siren text NOT NULL,
  company_name text,
  year_month text NOT NULL,
  billed boolean NOT NULL DEFAULT false,
  amount_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, siren, year_month)
);

CREATE INDEX IF NOT EXISTS idx_prospection_contacts_month ON public.prospection_contacts(user_id, year_month);

ALTER TABLE public.prospection_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their prospection contacts" ON public.prospection_contacts;
CREATE POLICY "Users manage their prospection contacts"
  ON public.prospection_contacts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
