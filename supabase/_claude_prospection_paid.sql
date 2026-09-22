-- Contacts de prospection au-delà du forfait : le paiement devient obligatoire.
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
-- Avant : le client confirmait « ce contact sera facturé 2 € » puis écrivait
-- lui-même la ligne — l'argent n'était jamais encaissé. Désormais c'est le
-- webhook Stripe (service_role) qui crée la ligne facturée, et le client ne
-- peut plus écrire que les contacts INCLUS dans son forfait.

ALTER TABLE public.prospection_contacts
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- Les contacts déjà enregistrés comme facturés n'ont jamais été payés :
-- on les laisse tels quels (historique), mais ils sont marqués non payés.

DROP POLICY IF EXISTS "Users manage their prospection contacts" ON public.prospection_contacts;

-- Lecture : ses propres contacts
CREATE POLICY "Prospection : lecture de ses contacts"
  ON public.prospection_contacts FOR SELECT
  USING (user_id = auth.uid());

-- Écriture : uniquement les contacts inclus dans le forfait (jamais facturés).
-- Un contact facturé ne peut être créé que par le service_role (webhook Stripe).
CREATE POLICY "Prospection : enregistrer un contact inclus"
  ON public.prospection_contacts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND billed = false AND paid = false);

CREATE POLICY "Prospection : mise à jour de ses contacts non facturés"
  ON public.prospection_contacts FOR UPDATE
  USING (user_id = auth.uid() AND billed = false)
  WITH CHECK (user_id = auth.uid() AND billed = false AND paid = false);
