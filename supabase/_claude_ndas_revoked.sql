-- Data Room : bloquer un signataire du NDA échouait ("new row for relation
-- ndas violates check constraint") car la contrainte n'autorisait pas 'revoked'.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
ALTER TABLE public.ndas DROP CONSTRAINT IF EXISTS ndas_status_check;
ALTER TABLE public.ndas ADD CONSTRAINT ndas_status_check CHECK (status IN ('pending','signed','rejected','revoked'));
