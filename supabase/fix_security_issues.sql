-- ==============================================================================
-- FIX: PRIVATE CONTACT INFO LEAK & REALTIME ACTIVITY LEAK
-- Please run this script in your Supabase SQL Editor to secure your database.
-- ==============================================================================

-- 1. Create a secure view for profiles to dynamically mask private contact info
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.show_email,
  p.show_phone,
  p.updated_at,
  p.is_admin,
  CASE 
    WHEN p.show_email = true 
      OR auth.uid() = p.id 
      OR EXISTS (SELECT 1 FROM public.profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)
    THEN p.contact_email 
    ELSE NULL 
  END as contact_email,
  CASE 
    WHEN p.show_phone = true 
      OR auth.uid() = p.id 
      OR EXISTS (SELECT 1 FROM public.profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)
    THEN p.phone 
    ELSE NULL 
  END as phone
FROM public.profiles p;

-- Ensure the view is accessible
GRANT SELECT ON public.safe_profiles TO anon, authenticated;

-- 2. Restrict RLS on connections to prevent Realtime broadcast leaks
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connections visibility" ON public.connections;
CREATE POLICY "Connections visibility"
ON public.connections FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- 3. Restrict RLS on favorites to prevent Realtime broadcast leaks
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Favorites visibility" ON public.favorites;
CREATE POLICY "Favorites visibility"
ON public.favorites FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);