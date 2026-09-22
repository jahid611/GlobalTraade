-- Tâches planifiées de Globly (pg_cron + pg_net).
--
-- Les clés ne figurent JAMAIS dans la définition des tâches : elles sont lues
-- au moment de l'exécution dans le coffre-fort (`vault`). À déposer une fois :
--
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--   select vault.create_secret('<RECONCILE_KEY>',    'reconcile_key');
--
-- À coller dans Supabase Studio > SQL Editor. Idempotent (chaque tâche est
-- déprogrammée avant d'être reprogrammée).

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Lecture d'un secret du coffre, en une fonction pour ne pas la répéter.
CREATE OR REPLACE FUNCTION public.secret(p_nom text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_nom LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.secret(text) FROM anon, authenticated;

-- Déprogrammation préalable (cron.unschedule lève si la tâche n'existe pas)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['renewal-reminder', 'match-digest', 'reconcile-stripe'] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = t) THEN
      PERFORM cron.unschedule(t);
    END IF;
  END LOOP;
END $$;

-- 08:00 — relance des vendeurs dont l'annonce attend une confirmation
SELECT cron.schedule('renewal-reminder', '0 8 * * *', $cron$
  SELECT net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/renewal-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || public.secret('service_role_key')),
    timeout_milliseconds := 30000
  );
$cron$);

-- 09:00 — résumé des nouvelles annonces correspondant aux critères
SELECT cron.schedule('match-digest', '0 9 * * *', $cron$
  SELECT net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/match-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || public.secret('service_role_key')),
    timeout_milliseconds := 60000
  );
$cron$);

-- 03:30 — rattrapage des paiements Stripe dont l'événement s'est perdu
SELECT cron.schedule('reconcile-stripe', '30 3 * * *', $cron$
  SELECT net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/reconcile-stripe',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-reconcile-key', public.secret('reconcile_key')),
    timeout_milliseconds := 60000
  );
$cron$);
