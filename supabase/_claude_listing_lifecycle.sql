-- ============================================================
-- CYCLE DE VIE DES ANNONCES (vendeur)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
-- Règles métier :
--  1. Annonce gratuite, active par défaut.
--  2. Tous les 90 jours, relance au vendeur (email via l'edge
--     function `renewal-reminder` + bannière dans le Dashboard).
--  3. Sans confirmation sous 10 jours -> statut 'inactive'
--     (plus visible sur le site, messagerie toujours accessible).
--  4. Le vendeur peut réactiver gratuitement à tout moment.
--  5. Après 30 jours d'inactivité -> suppression automatique.
--
-- Après avoir exécuté ce fichier :
--  - Déployer l'edge function :  supabase functions deploy renewal-reminder
--  - Planifier son appel quotidien (Dashboard > Integrations > Cron),
--    ou laisser uniquement la bannière in-app si l'email n'est pas prêt.
-- ============================================================

-- 1) Colonnes de cycle de vie
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS renewal_requested_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS inactive_since timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at timestamptz;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active', 'pending_renewal', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);

-- Backfill : les annonces existantes repartent d'un cycle complet
UPDATE public.listings
SET last_confirmed_at = COALESCE(updated_at, created_at, now())
WHERE last_confirmed_at IS NULL;

-- 2) Transitions quotidiennes
CREATE OR REPLACE FUNCTION public.process_listing_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 90 jours sans confirmation -> demande de renouvellement
  UPDATE public.listings
  SET status = 'pending_renewal',
      renewal_requested_at = now(),
      renewal_reminder_sent_at = NULL
  WHERE status = 'active'
    AND last_confirmed_at < now() - interval '90 days';

  -- 10 jours sans réponse à la relance -> annonce en pause
  UPDATE public.listings
  SET status = 'inactive',
      inactive_since = now()
  WHERE status = 'pending_renewal'
    AND renewal_requested_at < now() - interval '10 days';

  -- 30 jours en pause -> suppression définitive
  DELETE FROM public.listings
  WHERE status = 'inactive'
    AND inactive_since < now() - interval '30 days';
END;
$$;

-- 3) Confirmation / réactivation en 1 clic par le propriétaire
CREATE OR REPLACE FUNCTION public.confirm_listing_active(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET status = 'active',
      last_confirmed_at = now(),
      renewal_requested_at = NULL,
      inactive_since = NULL,
      renewal_reminder_sent_at = NULL
  WHERE id = p_listing_id
    AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable ou non autorisée';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_listing_active(uuid) TO authenticated;

-- 4) Planification quotidienne (pg_cron est disponible sur Supabase Cloud)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'listing-lifecycle') THEN
    PERFORM cron.unschedule('listing-lifecycle');
  END IF;
END;
$$;

SELECT cron.schedule('listing-lifecycle', '0 3 * * *', $$SELECT public.process_listing_lifecycle()$$);
