-- 1. Ajoute la colonne is_admin à la table profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Donne-toi les droits (Remplace 'TON_EMAIL' par ton email de test)
UPDATE profiles 
SET is_admin = TRUE 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ton-email@exemple.com'
);