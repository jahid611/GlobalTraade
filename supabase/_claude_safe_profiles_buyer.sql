-- Expose plan_type (au lieu de seulement l'alias 'plan') et les critères de
-- reprise (publics) dans la vue safe_profiles, pour afficher le "Projet de
-- reprise" sur le profil et débloquer l'affichage des coordonnées des payants.
-- À coller dans Supabase Studio > SQL Editor.
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT
  id, full_name, avatar_url, bio, show_email, show_phone, updated_at, is_admin, kyc_status,
  plan_type AS plan,
  CASE WHEN show_email = true OR auth.uid() = id OR (EXISTS (SELECT 1 FROM profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)) THEN contact_email ELSE NULL::text END AS contact_email,
  CASE WHEN show_phone = true OR auth.uid() = id OR (EXISTS (SELECT 1 FROM profiles admin_p WHERE admin_p.id = auth.uid() AND admin_p.is_admin = true)) THEN phone ELSE NULL::text END AS phone,
  plan_type,
  buyer_type, buyer_level, target_sectors, target_geo, target_budget, target_revenue, apport, experience, ambitions
FROM profiles p;
GRANT SELECT ON public.safe_profiles TO authenticated, anon;
