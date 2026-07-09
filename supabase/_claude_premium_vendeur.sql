-- ============================================================
-- PREMIUM VENDEUR
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - listings.is_premium : mise en avant (tri prioritaire + badge)
--    synchronisé automatiquement avec le plan du propriétaire.
--  - profiles.ape_code : code APE du vendeur, obligatoire pour la
--    prospection Radar (bridée à son propre secteur).
--  - RLS : le propriétaire d'une annonce peut voir QUI l'a mise
--    en favori (fonctionnalité premium « qui a vu / aimé »).
-- ============================================================

-- 1) Colonnes
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ape_code text;

CREATE INDEX IF NOT EXISTS idx_listings_is_premium ON public.listings(is_premium) WHERE is_premium;

-- 2) is_premium suit le plan du propriétaire
CREATE OR REPLACE FUNCTION public.sync_listing_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(plan_type = 'premium', false) INTO NEW.is_premium
  FROM public.profiles WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_listing_premium ON public.listings;
CREATE TRIGGER trg_sync_listing_premium
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_premium();

-- Quand un profil passe premium (ou le perd), ses annonces suivent
CREATE OR REPLACE FUNCTION public.sync_owner_listings_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.plan_type, '') IS DISTINCT FROM COALESCE(OLD.plan_type, '') THEN
    UPDATE public.listings
    SET is_premium = (NEW.plan_type = 'premium')
    WHERE owner_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_owner_listings_premium ON public.profiles;
CREATE TRIGGER trg_sync_owner_listings_premium
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_owner_listings_premium();

-- Synchronisation initiale
UPDATE public.listings l
SET is_premium = (p.plan_type = 'premium')
FROM public.profiles p
WHERE p.id = l.owner_id
  AND l.is_premium IS DISTINCT FROM (p.plan_type = 'premium');

-- 3) Le propriétaire d'une annonce voit qui l'a mise en favori
DROP POLICY IF EXISTS "Listing owners can view favorites on their listings" ON public.favorites;
CREATE POLICY "Listing owners can view favorites on their listings"
  ON public.favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = favorites.listing_id AND l.owner_id = auth.uid()
    )
  );
