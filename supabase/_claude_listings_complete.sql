-- =====================================================================
-- Migration idempotente : garantit que la table public.listings possède
-- TOUS les champs utilisés par le formulaire de cession (ListingForm).
-- À coller/exécuter dans Supabase -> SQL Editor. Sans risque sur l'existant
-- (ADD COLUMN IF NOT EXISTS ne touche pas aux colonnes déjà présentes).
-- =====================================================================

ALTER TABLE public.listings
  -- Champs financiers / historique
  ADD COLUMN IF NOT EXISTS revenue_n2          NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_n3          NUMERIC,
  -- Descriptifs
  ADD COLUMN IF NOT EXISTS description         TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_selling  TEXT,
  ADD COLUMN IF NOT EXISTS established_year     INTEGER,
  ADD COLUMN IF NOT EXISTS website_url          TEXT,
  ADD COLUMN IF NOT EXISTS hide_siret           BOOLEAN DEFAULT false,
  -- Critères "Capital Immatériel" (étape 5) — ceux qui manquaient
  ADD COLUMN IF NOT EXISTS management_type       TEXT,
  ADD COLUMN IF NOT EXISTS client_concentration  TEXT,
  ADD COLUMN IF NOT EXISTS digital_maturity      TEXT,
  ADD COLUMN IF NOT EXISTS market_trend          TEXT;

-- Recharge le cache de schéma PostgREST pour que l'API voie les colonnes tout de suite.
NOTIFY pgrst, 'reload schema';
