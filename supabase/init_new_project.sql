-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SUPPRESSION DES TABLES EXISTANTES (Pour un clean reset si besoin)
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.profile_views CASCADE;
DROP TABLE IF EXISTS public.listing_views CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. CREATION DES TABLES

-- Profiles
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    contact_email TEXT,
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Annonces (Listings)
CREATE TABLE public.listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    siret TEXT NOT NULL,
    hide_siret BOOLEAN DEFAULT false,
    industry TEXT NOT NULL,
    website_url TEXT,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    price NUMERIC NOT NULL,
    revenue_n1 NUMERIC NOT NULL,
    revenue_n2 NUMERIC,
    revenue_n3 NUMERIC,
    ebitda NUMERIC NOT NULL,
    rent NUMERIC NOT NULL,
    employees INTEGER NOT NULL,
    surface NUMERIC NOT NULL,
    lease_details TEXT NOT NULL,
    description TEXT NOT NULL,
    reason_for_selling TEXT,
    established_year INTEGER,
    logo_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Vues des annonces
CREATE TABLE public.listing_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Vues des profils
CREATE TABLE public.profile_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Favoris
CREATE TABLE public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, listing_id)
);

-- Messages
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Relations (Connections)
CREATE TABLE public.connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(requester_id, recipient_id)
);

-- 4. TRIGGER POUR CREER LE PROFIL AUTOMATIQUEMENT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. CONFIGURATION DU STORAGE (BUCKET POUR LES IMAGES)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- 6. SECURITE : ROW LEVEL SECURITY (RLS)

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Politiques Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Politiques Listings
CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id);

-- Politiques Vues
CREATE POLICY "Views are viewable by everyone" ON public.listing_views FOR SELECT USING (true);
CREATE POLICY "Anyone can insert listing views" ON public.listing_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Profile views are viewable by everyone" ON public.profile_views FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profile views" ON public.profile_views FOR INSERT WITH CHECK (true);

-- Politiques Favoris
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Politiques Messages
CREATE POLICY "Users can read their messages" ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Politiques Connections
CREATE POLICY "Users can view their connections" ON public.connections FOR SELECT USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users can send connection requests" ON public.connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their connections" ON public.connections FOR UPDATE USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users can delete their connections" ON public.connections FOR DELETE USING (auth.uid() IN (requester_id, recipient_id));

-- Politiques Storage (Images)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'listings' );
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'listings' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'listings' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'listings' AND auth.role() = 'authenticated' );

-- FIN DU SCRIPT