-- 1. ACTIVATION DE LA SÉCURITÉ SUR TOUTES LES TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUES POUR 'PROFILES' (Profils utilisateurs)
DROP POLICY IF EXISTS "Profils publics" ON profiles;
CREATE POLICY "Profils publics" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification de son propre profil" ON profiles;
CREATE POLICY "Modification de son propre profil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. POLITIQUES POUR 'LISTINGS' (Fonds de commerce)
DROP POLICY IF EXISTS "Listings publics" ON listings;
CREATE POLICY "Listings publics" ON listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Création autorisée aux connectés" ON listings;
CREATE POLICY "Création autorisée aux connectés" ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Modification par le propriétaire" ON listings;
CREATE POLICY "Modification par le propriétaire" ON listings FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Suppression par le propriétaire" ON listings;
CREATE POLICY "Suppression par le propriétaire" ON listings FOR DELETE USING (auth.uid() = owner_id);

-- 4. POLITIQUES POUR 'MESSAGES' (Messagerie privée)
DROP POLICY IF EXISTS "Lecture de ses propres messages" ON messages;
CREATE POLICY "Lecture de ses propres messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Envoi de messages" ON messages;
CREATE POLICY "Envoi de messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Marquer un message comme lu" ON messages;
CREATE POLICY "Marquer un message comme lu" ON messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. POLITIQUES POUR 'FAVORITES' (Favoris)
DROP POLICY IF EXISTS "Lecture de ses favoris" ON favorites;
CREATE POLICY "Lecture de ses favoris" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Ajout de favoris" ON favorites;
CREATE POLICY "Ajout de favoris" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Suppression de favoris" ON favorites;
CREATE POLICY "Suppression de favoris" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- 6. POLITIQUES POUR 'CONNECTIONS' (Réseau/Relations)
DROP POLICY IF EXISTS "Voir ses relations" ON connections;
CREATE POLICY "Voir ses relations" ON connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Ajouter relation" ON connections;
CREATE POLICY "Ajouter relation" ON connections FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Mise à jour (Accepter)" ON connections;
CREATE POLICY "Mise à jour (Accepter)" ON connections FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Supprimer relation" ON connections;
CREATE POLICY "Supprimer relation" ON connections FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);