-- Colonnes manquantes sur profiles requises par KYC / plans / admin / safe_profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin    boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status  text    DEFAULT 'none'
  CHECK (kyc_status IN ('none','pending','verified','rejected'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan        text    DEFAULT 'free'
  CHECK (plan IN ('free','premium'));
