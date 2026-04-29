-- Exécutez cette requête dans l'éditeur SQL de votre Supabase local
-- Elle validera instantanément l'adresse e-mail de tous les comptes en attente

UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;