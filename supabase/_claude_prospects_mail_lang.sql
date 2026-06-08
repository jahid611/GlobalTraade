-- Mémorise la langue de l'email de prise de contact par prospect (cross-device).
-- À exécuter dans Supabase -> SQL Editor. Idempotent et sans risque.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS mail_lang text;

-- Recharge le cache de schéma PostgREST pour que l'API voie la colonne tout de suite.
NOTIFY pgrst, 'reload schema';
