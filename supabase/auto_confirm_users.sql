-- ⛔ NE PAS REJOUER sur la base actuelle — fichier conservé pour l'historique.
-- Il marque tous les comptes en attente comme ayant confirmé leur email, sans
-- qu'ils l'aient fait : n'importe qui pourrait s'inscrire avec l'adresse d'un tiers.

-- Exécutez cette requête dans l'éditeur SQL de votre Supabase local
-- Elle validera instantanément l'adresse e-mail de tous les comptes en attente

UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;