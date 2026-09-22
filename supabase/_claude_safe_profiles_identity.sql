-- Identité professionnelle sur le profil public.
--
-- L'onboarding collectait « Vous êtes », la raison sociale, la forme juridique,
-- la fonction et le pays… qui n'étaient affichés nulle part. Ces informations
-- sont exactement ce qu'un interlocuteur veut savoir avant d'engager une
-- discussion de cession : on les expose.
--
-- Le SIREN reste volontairement PRIVÉ (identification de l'entreprise du membre,
-- utile à la vérification KYC, pas à l'affichage public).
--
-- À coller dans Supabase Studio > SQL Editor. Recrée la vue à l'identique en
-- ajoutant 5 colonnes — reprend _claude_safe_profiles_buyer.sql.

CREATE OR REPLACE VIEW public.safe_profiles
WITH (security_invoker = false) AS
SELECT
  id, full_name, avatar_url, bio, show_email, show_phone, updated_at, is_admin, kyc_status,
  plan_type AS plan,
  CASE WHEN show_email = true OR auth.uid() = id OR (EXISTS (SELECT 1 FROM profiles ap WHERE ap.id = auth.uid() AND ap.is_admin = true)) THEN contact_email ELSE NULL::text END AS contact_email,
  CASE WHEN show_phone = true OR auth.uid() = id OR (EXISTS (SELECT 1 FROM profiles ap WHERE ap.id = auth.uid() AND ap.is_admin = true)) THEN phone ELSE NULL::text END AS phone,
  plan_type,
  buyer_type, buyer_level, target_sectors, target_geo, target_budget, target_revenue, apport, experience, ambitions,
  (SELECT count(*) FROM profile_views v WHERE v.profile_id = p.id) AS profile_views_count,
  -- Identité professionnelle (issue de l'onboarding).
  -- ⚠️ Ajoutée APRÈS profile_views_count, et surtout pas au milieu :
  -- CREATE OR REPLACE VIEW interdit de renommer ou de réordonner les colonnes
  -- existantes, il n'autorise qu'un ajout en fin de liste.
  account_type, company_name, legal_form, role_function, country
FROM profiles p;

GRANT SELECT ON public.safe_profiles TO authenticated, anon;
