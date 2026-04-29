-- 1. On s'assure qu'on repart de zéro pour cette table
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;

-- 2. On supprime TOUTES les règles existantes possibles
DROP POLICY IF EXISTS "select_favorites" ON favorites;
DROP POLICY IF EXISTS "insert_favorites" ON favorites;
DROP POLICY IF EXISTS "delete_favorites" ON favorites;
DROP POLICY IF EXISTS "owners_can_see_favorites" ON favorites;
DROP POLICY IF EXISTS "manage_own_favorites" ON favorites;
DROP POLICY IF EXISTS "read_listing_favorites" ON favorites;

-- 3. On réactive la sécurité
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 4. RÈGLE DE LECTURE (SELECT)
-- L'utilisateur peut voir ses propres favoris, et les propriétaires d'annonces peuvent voir les favoris de leurs annonces
CREATE POLICY "Favorites Select Policy" 
ON favorites FOR SELECT 
TO authenticated
USING ( 
  auth.uid() = user_id OR 
  auth.uid() IN (SELECT owner_id FROM listings WHERE id = listing_id) 
);

-- 5. RÈGLE D'INSERTION (INSERT)
-- Un utilisateur connecté ne peut créer un favori que pour lui-même
CREATE POLICY "Favorites Insert Policy" 
ON favorites FOR INSERT 
TO authenticated
WITH CHECK ( auth.uid() = user_id );

-- 6. RÈGLE DE SUPPRESSION (DELETE)
-- Un utilisateur connecté ne peut supprimer que ses propres favoris
CREATE POLICY "Favorites Delete Policy" 
ON favorites FOR DELETE 
TO authenticated
USING ( auth.uid() = user_id );