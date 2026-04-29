-- 1. Création de la fonction qui valide l'email immédiatement
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- On définit la date de confirmation à l'instant présent
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Création du trigger qui s'exécute AVANT l'insertion d'un utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();