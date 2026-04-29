-- 1. Index pour la recherche par secteur (très utilisé sur la Marketplace)
CREATE INDEX IF NOT EXISTS idx_listings_industry ON listings (industry);

-- 2. Index pour le filtrage par prix (tri croissant/décroissant)
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);

-- 3. Index pour le calcul du ROI et le filtrage par EBE (EBITDA)
CREATE INDEX IF NOT EXISTS idx_listings_ebitda ON listings (ebitda);

-- 4. Index pour le Dashboard (récupérer les annonces d'un utilisateur spécifique)
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings (owner_id);

-- 5. Index pour la localisation (Latitude/Longitude)
-- Utile pour les requêtes géographiques futures si on veut filtrer par rayon
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings (lat, lng);

-- 6. Index sur la date de création pour le tri 'Plus récentes'
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC);

-- 7. Index sur la table des messages pour accélérer le chargement des conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (listing_id, sender_id, receiver_id);

-- 8. Index sur les favoris pour accélérer le chargement du portefeuille
CREATE INDEX IF NOT EXISTS idx_favorites_user_listing ON favorites (user_id, listing_id);