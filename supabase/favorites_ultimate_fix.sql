-- 1. Nettoyer les doublons potentiels (garde le favori le plus récent)
DELETE FROM favorites WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, listing_id ORDER BY created_at DESC) as rn
    FROM favorites
  ) t WHERE t.rn > 1
);

-- 2. Empêcher les futurs doublons (qui font planter l'UI)
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_listing_unique;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id);

-- 3. Réinitialiser les règles de sécurité
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_favorites" ON favorites;
DROP POLICY IF EXISTS "insert_favorites" ON favorites;
DROP POLICY IF EXISTS "delete_favorites" ON favorites;
DROP POLICY IF EXISTS "owners_can_see_favorites" ON favorites;
DROP POLICY IF EXISTS "manage_own_favorites" ON favorites;
DROP POLICY IF EXISTS "read_listing_favorites" ON favorites;

-- 4. Règle 1 : Un utilisateur peut TOUT faire sur ses propres favoris
CREATE POLICY "manage_own_favorites" ON favorites 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Règle 2 : Le propriétaire d'une annonce peut VOIR qui l'a mise en favori (pour le Dashboard)
CREATE POLICY "read_listing_favorites" ON favorites 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM listings WHERE listings.id = favorites.listing_id AND listings.owner_id = auth.uid())
);