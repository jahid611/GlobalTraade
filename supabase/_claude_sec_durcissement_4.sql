-- Durcissement 4 : forfait de prospection tenu par la base, règles admin
-- alignées sur la double authentification.
-- Sûr à rejouer.

-- ------------------------------------------------------------------
-- 1. Prospection : le forfait mensuel (20 contacts inclus) est appliqué ici.
--    Avant, le membre pouvait insérer lui-même autant de lignes « incluses »
--    qu'il voulait : seul le site comptait.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_prospection_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  month_key text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  used integer;
BEGIN
  -- Webhook Stripe et fonctions serveur : ce sont eux qui créent les contacts payés.
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF me IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  IF NEW.siren IS NULL OR NEW.siren !~ '^\d{9}$' THEN
    RAISE EXCEPTION 'SIREN invalide' USING ERRCODE = '22023';
  END IF;

  -- Tout ce qui compte est fixé par le serveur, jamais par le membre.
  NEW.user_id := me;
  NEW.year_month := month_key;
  NEW.billed := false;
  NEW.paid := false;
  NEW.amount_cents := 0;
  NEW.sent_to := NULL;
  NEW.sent_count := 0;
  NEW.last_sent_at := NULL;
  NEW.created_at := now();
  NEW.company_name := left(NEW.company_name, 200);

  -- Deux enregistrements simultanés ne doivent pas passer tous les deux.
  PERFORM pg_advisory_xact_lock(hashtext('prospection:' || me::text));

  -- Entreprise déjà comptée ce mois-ci : l'insertion sera ignorée (doublon).
  IF EXISTS (
    SELECT 1 FROM public.prospection_contacts c
    WHERE c.user_id = me AND c.siren = NEW.siren AND c.year_month = month_key
  ) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO used
  FROM public.prospection_contacts c
  WHERE c.user_id = me AND c.year_month = month_key;

  IF used >= 20 THEN
    RAISE EXCEPTION 'Forfait mensuel de prospection atteint : ce contact supplémentaire doit être réglé.'
      USING ERRCODE = 'P0001', HINT = 'prospection_quota';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_prospection_insert ON public.prospection_contacts;
CREATE TRIGGER trg_guard_prospection_insert
  BEFORE INSERT ON public.prospection_contacts
  FOR EACH ROW EXECUTE FUNCTION public.guard_prospection_insert();

-- Le membre n'a besoin que de lire et d'ajouter un contact inclus.
REVOKE UPDATE, DELETE ON public.prospection_contacts FROM anon, authenticated;
REVOKE INSERT ON public.prospection_contacts FROM anon;

-- ------------------------------------------------------------------
-- 2. Deux règles lisaient encore le rôle admin sans passer par
--    current_user_is_admin() (qui exige la double authentification
--    quand elle est activée).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
CREATE POLICY "Admins can read all documents" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents' AND (auth.uid() = owner OR public.current_user_is_admin()));

DROP POLICY IF EXISTS "Published ratings are readable" ON public.ratings;
CREATE POLICY "Published ratings are readable" ON public.ratings
  FOR SELECT
  USING (
    status = 'published'
    OR rater_id = auth.uid()
    OR rated_id = auth.uid()
    OR public.current_user_is_admin()
  );
