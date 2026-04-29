-- ==============================================================================
-- FIX: KYC visibility in safe_profiles, listing_views RLS, admin KYC updates
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Recreate safe_profiles view WITH kyc_status and plan columns
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
  p.kyc_status,
  p.plan,
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

GRANT SELECT ON public.safe_profiles TO anon, authenticated;

-- 2. Allow admins to update any profile (needed for KYC approval/rejection)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)
);

-- 3. Fix listing_views SELECT policy: everyone can read view counts (they are public stats)
DROP POLICY IF EXISTS "Owners can view their listing views" ON public.listing_views;
DROP POLICY IF EXISTS "Anyone can view listing views" ON public.listing_views;
CREATE POLICY "Anyone can view listing views"
ON public.listing_views FOR SELECT
USING (true);

-- 4. Create a storage bucket for KYC documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;

-- 5. Storage policies for the documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
CREATE POLICY "Admins can read all documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' AND (
    auth.uid() = owner 
    OR EXISTS (SELECT 1 FROM public.profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)
  )
);

-- 6. Create dismissed_notifications table for persistent notification dismissals
CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_key text NOT NULL,
  dismissed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT dismissed_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT dismissed_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT dismissed_notifications_unique UNIQUE (user_id, notification_key)
);

ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their dismissed notifications" ON public.dismissed_notifications;
CREATE POLICY "Users can manage their dismissed notifications"
ON public.dismissed_notifications FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
