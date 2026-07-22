-- ============================================================
-- FIX OFFRES — « une erreur est survenue » à l'envoi d'une offre.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
-- Cause : les messages d'offre/proposition écrivent les colonnes
-- `type` ('offer' | 'need_offer') et `metadata` (jsonb : montant,
-- financement, statut…), qui n'existaient pas sur la table messages.
-- Toute insertion d'offre était donc rejetée.
-- ============================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata jsonb;
