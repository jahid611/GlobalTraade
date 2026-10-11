-- =====================================================================
-- MESSAGERIE — suppression « pour moi » et notifications en direct
-- =====================================================================
-- Constaté en rejouant de vraies conversations le 11/10/2026 :
--
--   1. « Supprimer la conversation » effaçait les messages POUR LES DEUX,
--      offre acceptée comprise, et le destinataire pouvait supprimer un
--      message qu'il avait reçu. L'autre perdait son historique sans le
--      savoir — et un vendeur en formule gratuite ne pouvait plus relancer
--      l'acheteur (plus aucune trace d'une conversation existante).
--   2. Seule la table `messages` était diffusée en temps réel : demandes de
--      relation et mises en favori n'apparaissaient qu'au rechargement.
--
-- Désormais :
--   - supprimer une conversation (ou un message reçu) la MASQUE pour soi :
--     l'autre garde tout. La ligne reste en base, donc la règle « répondre
--     à une conversation existante est toujours permis » continue de jouer.
--   - seul l'expéditeur peut réellement supprimer son propre message, et
--     jamais une offre acceptée (elle engage les deux parties).
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Qui a masqué quoi
-- ---------------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hidden_for uuid[] NOT NULL DEFAULT '{}';

-- Lecture : ses messages, sauf ceux qu'on a masqués.
DROP POLICY IF EXISTS "Lecture de ses propres messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Messages : lecture des siens, non masqués" ON public.messages;
CREATE POLICY "Messages : lecture des siens, non masqués"
  ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT (auth.uid() = ANY (hidden_for))
  );

-- Suppression réelle : l'expéditeur seulement, et pas une offre acceptée.
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Messages : retrait par l'expéditeur" ON public.messages;
CREATE POLICY "Messages : retrait par l'expéditeur"
  ON public.messages FOR DELETE
  USING (
    auth.uid() = sender_id
    AND COALESCE(metadata ->> 'status', '') <> 'accepted'
  );

-- ---------------------------------------------------------------------
-- 2) `hidden_for` ne se modifie que par les deux fonctions ci-dessous
-- ---------------------------------------------------------------------
-- Sans cette garde, un membre pourrait écrire l'identifiant de l'AUTRE dans
-- hidden_for et lui faire disparaître des messages. Les fonctions posent un
-- drapeau local à la transaction ; hors de là, la valeur est rétablie.
CREATE OR REPLACE FUNCTION public.protect_message_hidden()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.hidden_for := '{}';
  ELSIF COALESCE(current_setting('globly.hiding', true), '') <> '1' THEN
    NEW.hidden_for := OLD.hidden_for;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_hidden ON public.messages;
CREATE TRIGGER trg_protect_message_hidden
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_message_hidden();

-- Masque, pour l'appelant seulement, toute sa conversation avec `p_other` au
-- sujet d'une annonce ou d'un projet. Renvoie le nombre de messages masqués.
CREATE OR REPLACE FUNCTION public.hide_conversation(p_other uuid, p_listing uuid DEFAULT NULL, p_project uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  n integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  PERFORM set_config('globly.hiding', '1', true);
  UPDATE public.messages m
  SET hidden_for = array_append(m.hidden_for, me)
  WHERE ((m.sender_id = me AND m.receiver_id = p_other) OR (m.sender_id = p_other AND m.receiver_id = me))
    AND NOT (me = ANY (m.hidden_for))
    AND (
      (p_project IS NOT NULL AND m.project_id = p_project)
      OR (p_project IS NULL AND p_listing IS NOT NULL AND m.listing_id = p_listing)
      OR (p_project IS NULL AND p_listing IS NULL AND m.project_id IS NULL AND m.listing_id IS NULL)
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('globly.hiding', '', true);
  RETURN n;
END;
$$;

-- Masque un seul message pour l'appelant (un message REÇU qu'il ne veut plus voir).
CREATE OR REPLACE FUNCTION public.hide_message(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  n integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  PERFORM set_config('globly.hiding', '1', true);
  UPDATE public.messages m
  SET hidden_for = array_append(m.hidden_for, me)
  WHERE m.id = p_id
    AND (m.sender_id = me OR m.receiver_id = me)
    AND NOT (me = ANY (m.hidden_for));
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('globly.hiding', '', true);
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_conversation(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hide_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_conversation(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_message(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.protect_message_hidden() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Notifications en direct : relations et favoris
-- ---------------------------------------------------------------------
-- Le temps réel applique les règles de lecture de chaque table : un membre ne
-- reçoit que les lignes qu'il a le droit de lire. (`listings` n'est
-- volontairement pas ajoutée : ses colonnes confidentielles ne doivent pas
-- transiter par ce canal.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['connections', 'favorites'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
