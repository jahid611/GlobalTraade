-- =====================================================================
-- QUOTAS IMPOSÉS PAR LA BASE — octobre 2026
-- =====================================================================
-- Jusqu'ici les règles des formules n'étaient vérifiées que par
-- l'application : un appel direct à l'API les contournait (un compte gratuit
-- pouvait écrire à n'importe qui et publier sans limite). Elles sont
-- désormais appliquées ici, à l'identique de ce que fait l'application :
--
--   Messagerie (src/services/quotaService.ts → decideContactQuota)
--     - répondre dans une conversation existante : toujours permis
--     - business : illimité
--     - pro : 20 NOUVELLES conversations par mois
--     - gratuit : nouvelle conversation seulement avec l'auteur d'une
--       annonce / d'un projet / d'une recherche débloqué à 5 €
--
--   Publication (src/services/planService.ts → checkPublicationQuota)
--     - annonces actives + projets + recherches actives confondus :
--       gratuit 1, pro 5, business illimité
--
-- Les admins et le service_role ne sont pas limités. En cas de refus la base
-- lève une erreur explicite (l'application vérifie avant, donc un membre qui
-- passe par le site ne la voit jamais).
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Messagerie
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_contact_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  my_plan text;
  month_key text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  used_this_month integer;
  unlocked boolean;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF me IS NULL OR NEW.sender_id IS DISTINCT FROM me THEN RETURN NEW; END IF; -- la RLS refusera
  IF NEW.receiver_id = me THEN RETURN NEW; END IF;
  IF public.current_user_is_admin() THEN RETURN NEW; END IF;

  -- Conversation déjà engagée (dans un sens ou dans l'autre) : toujours permis.
  IF EXISTS (
    SELECT 1 FROM public.messages m
    WHERE (m.sender_id = me AND m.receiver_id = NEW.receiver_id)
       OR (m.sender_id = NEW.receiver_id AND m.receiver_id = me)
  ) THEN
    RETURN NEW;
  END IF;

  -- Contact déjà initié par le passé (conversation supprimée depuis).
  IF EXISTS (
    SELECT 1 FROM public.conversation_initiations ci
    WHERE ci.initiator_id = me AND ci.other_user_id = NEW.receiver_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.plan_type, 'free') INTO my_plan FROM public.profiles p WHERE p.id = me;
  my_plan := COALESCE(my_plan, 'free');

  IF my_plan = 'pro' THEN
    SELECT count(*) INTO used_this_month
    FROM public.conversation_initiations ci
    WHERE ci.initiator_id = me AND ci.year_month = month_key;
    IF used_this_month >= 20 THEN
      RAISE EXCEPTION 'Quota de nouvelles conversations atteint pour ce mois (formule Pro : 20).'
        USING ERRCODE = 'P0001', HINT = 'contact_quota';
    END IF;

  ELSIF my_plan <> 'business' THEN
    -- Gratuit : uniquement vers l'auteur d'un contenu débloqué à 5 €.
    unlocked :=
      (NEW.listing_id IS NOT NULL AND public.current_user_has_unlock('listing', NEW.listing_id)
        AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = NEW.listing_id AND l.owner_id = NEW.receiver_id))
      OR (NEW.project_id IS NOT NULL AND public.current_user_has_unlock('project', NEW.project_id)
        AND EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = NEW.project_id AND pr.owner_id = NEW.receiver_id))
      OR EXISTS (
        SELECT 1 FROM public.listing_unlocks u
        JOIN public.search_ads s ON s.id = u.target_id
        WHERE u.user_id = me AND u.target_type = 'search_ad' AND s.owner_id = NEW.receiver_id
      );
    IF NOT COALESCE(unlocked, false) THEN
      RAISE EXCEPTION 'La messagerie est réservée aux formules Pro et Business, ou à une annonce débloquée.'
        USING ERRCODE = 'P0001', HINT = 'contact_locked';
    END IF;
  END IF;

  -- C'est la base qui tient le compteur : le membre ne peut ni l'oublier ni
  -- l'effacer (voir aussi les règles de conversation_initiations).
  INSERT INTO public.conversation_initiations (initiator_id, other_user_id, listing_id, year_month)
  VALUES (me, NEW.receiver_id, NEW.listing_id, month_key)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contact_quota ON public.messages;
CREATE TRIGGER trg_enforce_contact_quota
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_quota();

-- ---------------------------------------------------------------------
-- 2) Publication
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_publication_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  my_plan text;
  max_active integer;
  used integer;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF me IS NULL OR public.current_user_is_admin() THEN RETURN NEW; END IF;

  -- En modification, seule une REMISE en ligne compte (pause → actif).
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'listings' THEN
      IF NOT (OLD.status = 'inactive' AND NEW.status <> 'inactive') THEN RETURN NEW; END IF;
    ELSIF TG_TABLE_NAME = 'search_ads' THEN
      IF NOT (OLD.status <> 'active' AND NEW.status = 'active') THEN RETURN NEW; END IF;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(p.plan_type, 'free') INTO my_plan FROM public.profiles p WHERE p.id = me;
  my_plan := COALESCE(my_plan, 'free');
  IF my_plan = 'business' THEN RETURN NEW; END IF;
  max_active := CASE WHEN my_plan = 'pro' THEN 5 ELSE 1 END;

  -- La ligne en cours n'est pas encore comptée (INSERT) ou est encore dans son
  -- ancien état, non compté (remise en ligne).
  SELECT
    (SELECT count(*) FROM public.listings   l WHERE l.owner_id = me AND l.status <> 'inactive')
  + (SELECT count(*) FROM public.projects   p WHERE p.owner_id = me)
  + (SELECT count(*) FROM public.search_ads s WHERE s.owner_id = me AND s.status = 'active')
  INTO used;

  IF used >= max_active THEN
    RAISE EXCEPTION 'Limite d''annonces actives atteinte pour votre formule (%).', max_active
      USING ERRCODE = 'P0001', HINT = 'publication_quota';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_publication_quota ON public.listings;
CREATE TRIGGER trg_enforce_publication_quota
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publication_quota();

DROP TRIGGER IF EXISTS trg_enforce_publication_quota ON public.projects;
CREATE TRIGGER trg_enforce_publication_quota
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publication_quota();

DROP TRIGGER IF EXISTS trg_enforce_publication_quota ON public.search_ads;
CREATE TRIGGER trg_enforce_publication_quota
  BEFORE INSERT OR UPDATE OF status ON public.search_ads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publication_quota();

-- Les fonctions de trigger n'ont pas à être appelables par l'API.
REVOKE ALL ON FUNCTION public.enforce_contact_quota() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_publication_quota() FROM PUBLIC, anon, authenticated;

COMMIT;
