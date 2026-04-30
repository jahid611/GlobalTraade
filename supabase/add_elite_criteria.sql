-- Ajout des critères "Elite" (Capital Immatériel) à la table des annonces
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS management_type TEXT,
ADD COLUMN IF NOT EXISTS client_concentration TEXT,
ADD COLUMN IF NOT EXISTS digital_maturity TEXT,
ADD COLUMN IF NOT EXISTS market_trend TEXT;

-- Mettre à jour les politiques de sécurité (RLS) si nécessaire
-- (Généralement les politiques existantes sur UPDATE/INSERT couvrent les nouvelles colonnes)