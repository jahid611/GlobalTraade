-- Exécutez ce script dans le SQL Editor de votre tableau de bord Supabase

-- 1. Autoriser la lecture des vues d'annonces pour tout le monde
DROP POLICY IF EXISTS "Enable read access for everyone on listing_views" ON public.listing_views;
CREATE POLICY "Enable read access for everyone on listing_views" ON public.listing_views FOR SELECT USING (true);

-- 2. Autoriser la lecture des vues de profils pour tout le monde
DROP POLICY IF EXISTS "Enable read access for everyone on profile_views" ON public.profile_views;
CREATE POLICY "Enable read access for everyone on profile_views" ON public.profile_views FOR SELECT USING (true);