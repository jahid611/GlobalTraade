-- ============================================================================
-- 1) CORRECTIF : garantit toutes les colonnes de profiles utilisées par Settings
--    (corrige l'erreur "column not found" à la mise à jour du profil).
-- 2) ONBOARDING : colonnes légales/obligatoires collectées à l'inscription.
-- À exécuter dans Supabase -> SQL Editor. Idempotent, sans risque sur l'existant.
-- ============================================================================

ALTER TABLE public.profiles
  -- Champs Settings (au cas où une migration n'aurait pas tourné)
  ADD COLUMN IF NOT EXISTS bio              text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS contact_email    text,
  ADD COLUMN IF NOT EXISTS show_email       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_phone       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS target_sectors   text,
  ADD COLUMN IF NOT EXISTS target_budget    text,
  ADD COLUMN IF NOT EXISTS target_geo       text,
  -- Onboarding (profil + entité + légal)
  ADD COLUMN IF NOT EXISTS account_type         text,   -- repreneur | cedant | investisseur | conseil
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS siren                text,
  ADD COLUMN IF NOT EXISTS legal_form           text,   -- SAS, SARL, EI, ...
  ADD COLUMN IF NOT EXISTS role_function        text,   -- fonction dans l'entreprise
  ADD COLUMN IF NOT EXISTS country              text DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS terms_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
