-- Requête à copier et exécuter dans le "SQL Editor" de Supabase
-- Cela va ajouter les nouveaux champs sans toucher aux annonces existantes

ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_selling TEXT,
  ADD COLUMN IF NOT EXISTS established_year INTEGER,
  ADD COLUMN IF NOT EXISTS revenue_n2 NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_n3 NUMERIC;