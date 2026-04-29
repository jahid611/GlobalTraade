-- Activer RLS pour s'assurer que la table est sécurisée
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Nettoyer les éventuelles anciennes règles pour repartir sur une base saine
DROP POLICY IF EXISTS "select_favorites" ON favorites;
DROP POLICY IF EXISTS "insert_favorites" ON favorites;
DROP POLICY IF EXISTS "delete_favorites" ON favorites;
DROP POLICY IF EXISTS "owners_can_see_favorites" ON favorites;

-- 1. Lecture : L'utilisateur voit ses favoris ET le propriétaire de l'annonce voit qui l'a mis en favori
CREATE POLICY "select_favorites" 
ON favorites FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM listings WHERE listings.id = favorites.listing_id AND listings.owner_id = auth.uid())
);

-- 2. Insertion : Un utilisateur ne peut s'ajouter des favoris qu'à lui-même
CREATE POLICY "insert_favorites" 
ON favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Suppression : Un utilisateur ne peut supprimer que ses propres favoris
CREATE POLICY "delete_favorites" 
ON favorites FOR DELETE 
USING (auth.uid() = user_id);