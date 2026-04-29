-- Add investment criteria columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_sectors text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_budget text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_geo text;

-- Update the safe_profiles view to include these new columns
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
  p.target_sectors,
  p.target_budget,
  p.target_geo,
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
