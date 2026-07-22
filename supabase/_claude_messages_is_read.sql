-- Colonne is_read manquante sur messages : le code (indicateur de non-lus dans
-- la navbar, marquage lu dans la messagerie) l'interroge sur chaque page → 400.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
UPDATE public.messages SET is_read = true WHERE is_read = false;  -- historique = lu
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id) WHERE is_read = false;
