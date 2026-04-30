-- 1. On supprime l'ancienne contrainte qui bloque le mot 'revoked'
ALTER TABLE public.ndas DROP CONSTRAINT IF EXISTS ndas_status_check;

-- 2. On ajoute la nouvelle contrainte en incluant 'revoked' (et les autres statuts standards pour être tranquille)
ALTER TABLE public.ndas ADD CONSTRAINT ndas_status_check CHECK (status IN ('signed', 'revoked', 'pending', 'rejected'));