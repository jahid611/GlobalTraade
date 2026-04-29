-- Copiez-collez ce script dans le SQL Editor de votre tableau de bord Supabase et cliquez sur "Run".

-- 1. Permettre aux propriétaires d'une annonce de voir qui a mis leur annonce en favori
CREATE POLICY "owners_can_see_favorites" 
ON favorites 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.id = favorites.listing_id 
    AND listings.owner_id = auth.uid()
  )
);

-- 2. S'assurer que les destinataires d'une demande de connexion peuvent bien la voir
CREATE POLICY "users_can_see_their_connections_received" 
ON connections 
FOR SELECT 
USING (
  auth.uid() = requester_id OR auth.uid() = recipient_id
);