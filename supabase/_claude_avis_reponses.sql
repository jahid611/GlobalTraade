-- =====================================================================
-- AVIS — répondre aux avis reçus
-- =====================================================================
-- Un membre pouvait être noté sans pouvoir lire ses avis ni y répondre.
-- Chaque avis peut désormais porter UNE réponse du membre noté.
--
-- Le membre noté ne doit pouvoir écrire QUE sa réponse (jamais la note ni le
-- commentaire) : on ne lui ouvre donc pas la table en modification, il passe
-- par une fonction qui ne touche qu'aux deux colonnes de réponse.
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_reply_length;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_reply_length
  CHECK (reply IS NULL OR char_length(reply) BETWEEN 1 AND 1000);

-- Répondre à un avis reçu (ou retirer sa réponse en passant un texte vide).
CREATE OR REPLACE FUNCTION public.reply_to_rating(p_rating_id uuid, p_reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reply text := NULLIF(btrim(COALESCE(p_reply, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF v_reply IS NOT NULL AND char_length(v_reply) > 1000 THEN
    RAISE EXCEPTION 'Réponse trop longue (1000 caractères au plus)' USING ERRCODE = '22001';
  END IF;

  -- Signale au déclencheur de protection qu'il s'agit d'une réponse (valable
  -- pour cette seule transaction).
  PERFORM set_config('globly.rating_reply', '1', true);

  UPDATE public.ratings
     SET reply = v_reply,
         replied_at = CASE WHEN v_reply IS NULL THEN NULL ELSE now() END
   WHERE id = p_rating_id
     AND rated_id = auth.uid()      -- seulement les avis que J'AI reçus
     AND status = 'published';      -- pas un avis encore en modération

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avis introuvable' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Le déclencheur qui protège les notes connaît maintenant la réponse :
--   - une réponse ne change RIEN d'autre (ni la note, ni son statut : sans cela,
--     répondre à une note basse déjà validée la renvoyait en modération) ;
--   - l'auteur d'une note ne peut pas écrire la réponse à la place du membre
--     noté, et s'il modifie sa note, l'ancienne réponse (qui n'y répond plus)
--     est retirée.
CREATE OR REPLACE FUNCTION public.protect_rating_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() OR public.current_user_is_admin() THEN RETURN NEW; END IF;

  IF current_setting('globly.rating_reply', true) = '1' THEN
    NEW.rater_id := OLD.rater_id;
    NEW.rated_id := OLD.rated_id;
    NEW.score := OLD.score;
    NEW.comment := OLD.comment;
    NEW.justification := OLD.justification;
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  NEW.rater_id := OLD.rater_id;
  NEW.rated_id := OLD.rated_id;
  IF (NEW.score, NEW.comment, NEW.justification) IS DISTINCT FROM (OLD.score, OLD.comment, OLD.justification) THEN
    NEW.reply := NULL;
    NEW.replied_at := NULL;
  ELSE
    NEW.reply := OLD.reply;
    NEW.replied_at := OLD.replied_at;
  END IF;
  IF NEW.score < 2.5 THEN
    NEW.status := 'under_review';
  ELSE
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_rating(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_rating(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
