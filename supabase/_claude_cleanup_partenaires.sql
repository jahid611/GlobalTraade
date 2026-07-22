-- Nettoyage : l'espace partenaire est devenu une simple vitrine (page /partenaire).
-- Les tables de l'ancien outil de gestion de dossiers ne sont plus utilisées.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
DROP TABLE IF EXISTS public.dossiers CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP FUNCTION IF EXISTS public.touch_dossier() CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS partner_type;
DROP POLICY IF EXISTS "Partners upload dossier files" ON storage.objects;
DROP POLICY IF EXISTS "Partners read their dossier files" ON storage.objects;
DROP POLICY IF EXISTS "Partners delete their dossier files" ON storage.objects;
-- Le bucket 'dossiers' se supprime via l'API Storage (interdit en SQL direct).
