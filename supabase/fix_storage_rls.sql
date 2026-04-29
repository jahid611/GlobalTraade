-- 1. S'assurer que le bucket existe et est bien public
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Activer RLS sur la table des objets (fichiers)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Nettoyer les anciennes politiques potentiellement défectueuses pour ce bucket
DROP POLICY IF EXISTS "Public read access for listings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert in listings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images in listings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images in listings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- 4. RECRÉER LES POLITIQUES DE FAÇON OPTIMALE

-- A. Tout le monde (même non connecté) peut lire et afficher les images
CREATE POLICY "Public read access for listings bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

-- B. N'importe quel utilisateur connecté peut UPLOADER (INSERT)
CREATE POLICY "Authenticated users can insert in listings bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings');

-- C. Un utilisateur connecté peut MODIFIER (UPDATE) ses propres images
CREATE POLICY "Users can update their own images in listings bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings' AND owner = auth.uid());

-- D. Un utilisateur connecté peut SUPPRIMER (DELETE) ses propres images
CREATE POLICY "Users can delete their own images in listings bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings' AND owner = auth.uid());