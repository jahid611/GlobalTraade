DROP TABLE IF EXISTS public.profile_views CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.listing_views CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.conversation_initiations CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.safe_profiles CASCADE;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  contact_email text,
  show_email boolean DEFAULT false,
  show_phone boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_admin boolean DEFAULT false,
  kyc_status text NOT NULL DEFAULT 'none'::text CHECK (kyc_status = ANY (ARRAY['none'::text, 'pending'::text, 'verified'::text, 'rejected'::text])),
  plan text NOT NULL DEFAULT 'free'::text CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'agency'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- LISTINGS
CREATE TABLE public.listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  siret text NOT NULL,
  hide_siret boolean DEFAULT false,
  industry text NOT NULL,
  website_url text,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  price numeric NOT NULL,
  revenue_n1 numeric NOT NULL,
  revenue_n2 numeric,
  revenue_n3 numeric,
  ebitda numeric NOT NULL,
  rent numeric NOT NULL,
  employees integer NOT NULL,
  surface numeric NOT NULL,
  lease_details text NOT NULL,
  description text NOT NULL,
  reason_for_selling text,
  established_year integer,
  logo_url text,
  image_urls text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- CONNECTIONS
CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT connections_pkey PRIMARY KEY (id),
  CONSTRAINT connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT connections_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- CONVERSATION INITIATIONS
CREATE TABLE public.conversation_initiations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL,
  other_user_id uuid NOT NULL,
  listing_id uuid,
  year_month text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversation_initiations_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_initiations_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT conversation_initiations_other_user_id_fkey FOREIGN KEY (other_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT conversation_initiations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

-- FAVORITES
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

-- LISTING VIEWS
CREATE TABLE public.listing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT listing_views_pkey PRIMARY KEY (id),
  CONSTRAINT listing_views_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- MESSAGES
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'text'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- PROFILE VIEWS
CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profile_views_pkey PRIMARY KEY (id),
  CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- VUE SAFE_PROFILES (Pour masquer les informations sensibles)
CREATE OR REPLACE VIEW public.safe_profiles AS
 SELECT p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.plan,
    p.is_admin,
    CASE WHEN p.show_email THEN p.contact_email ELSE NULL END AS contact_email,
    CASE WHEN p.show_phone THEN p.phone ELSE NULL END AS phone,
    p.show_email,
    p.show_phone,
    p.kyc_status,
    p.updated_at
   FROM public.profiles p;

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_initiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES (Sécurité "Bank-Grade")

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Listings
CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id);

-- Connections
CREATE POLICY "Users can view their connections" ON public.connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can insert connections" ON public.connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their connections" ON public.connections FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() = requester_id);
CREATE POLICY "Users can delete their connections" ON public.connections FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Favorites
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Views (Statistiques)
CREATE POLICY "Anyone can insert a listing view" ON public.listing_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view their listing views" ON public.listing_views FOR SELECT USING (auth.uid() IN (SELECT owner_id FROM public.listings WHERE id = listing_id));

CREATE POLICY "Anyone can insert a profile view" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their profile views" ON public.profile_views FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can view their conversation initiations" ON public.conversation_initiations FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = other_user_id);
CREATE POLICY "Users can insert conversation initiations" ON public.conversation_initiations FOR INSERT WITH CHECK (auth.uid() = initiator_id);

-- 4. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE USING (bucket_id = 'listings' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE USING (bucket_id = 'listings' AND auth.uid() = owner);

-- 5. Trigger d'auto-création de profil (Important pour éviter les profils fantômes)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, contact_email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
