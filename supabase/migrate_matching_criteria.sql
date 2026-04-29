-- ==============================================================================
-- GlobalTrade Excellence: Matching Criteria Migration
-- Migre les données de user_metadata vers les colonnes dédiées de public.profiles
-- ==============================================================================

-- 1. Ajout des colonnes si elles n'existent pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_sectors text,
ADD COLUMN IF NOT EXISTS target_geo text,
ADD COLUMN IF NOT EXISTS target_budget text;

-- 2. Migration des données existantes depuis auth.users
-- On récupère les metadata et on les injecte dans les colonnes correspondantes
DO $$
BEGIN
    UPDATE public.profiles p
    SET 
        target_sectors = (u.raw_user_meta_data->>'target_sectors'),
        target_geo = (u.raw_user_meta_data->>'target_geo'),
        target_budget = (u.raw_user_meta_data->>'target_budget')
    FROM auth.users u
    WHERE p.id = u.id
    AND (u.raw_user_meta_data->>'target_sectors' IS NOT NULL 
         OR u.raw_user_meta_data->>'target_geo' IS NOT NULL 
         OR u.raw_user_meta_data->>'target_budget' IS NOT NULL);
END $$;

-- 3. Indexation pour des performances de filtrage optimales
CREATE INDEX IF NOT EXISTS idx_profiles_target_sectors ON public.profiles(target_sectors);
CREATE INDEX IF NOT EXISTS idx_profiles_target_geo ON public.profiles(target_geo);
