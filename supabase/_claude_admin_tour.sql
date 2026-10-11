-- =====================================================================
-- ADMINISTRATION — la tour de contrôle
-- =====================================================================
-- Tout ce qu'un administrateur peut faire depuis l'application passe par la
-- base, qui vérifie elle-même qu'il est administrateur : l'écran n'est qu'une
-- façade. Ce fichier ajoute :
--
--   1. un journal de toutes les actions d'administration (infalsifiable depuis
--      l'application : personne ne peut y écrire ni l'effacer par l'API) ;
--   2. une double authentification respectée côté base : un administrateur qui
--      a activé le code à 6 chiffres n'est reconnu administrateur que dans une
--      session où ce code a été saisi ;
--   3. la suspension d'un compte (il ne peut plus publier ni écrire) ;
--   4. les actions de gestion : formule offerte, annonces, projets, recherches,
--      avis, mise en avant ;
--   5. les lectures réservées à l'admin : vue d'ensemble, membres (avec leur
--      adresse email et leur dernière connexion), achats ;
--   6. un bandeau d'annonce affiché sur tout le site.
--
-- Nommer ou retirer un administrateur reste volontairement impossible depuis
-- l'application : cela se fait en SQL.
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Qui est administrateur — avec la double authentification
-- ---------------------------------------------------------------------
-- Si l'administrateur a un code à 6 chiffres vérifié sur son compte, sa session
-- doit avoir passé ce code (niveau « aal2 »). Un mot de passe volé ne suffit
-- alors plus pour agir en administrateur.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false)
     AND (
       NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified')
       OR COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
     )
$$;

-- Une action d'administration en cours : les déclencheurs qui protègent les
-- colonnes sensibles (formule, mise en avant…) la laissent passer. Le drapeau
-- n'est posé que par les fonctions admin_* ci-dessous, APRÈS vérification, et
-- ne vit que le temps de la requête. Il ne peut pas être posé par l'API.
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  RETURN COALESCE(claims ->> 'role', 'service_role') = 'service_role'
      OR COALESCE(current_setting('globly.admin_op', true), '') = '1';
END;
$$;

-- À appeler en tête de chaque fonction admin_* : refuse tout le monde sauf
-- l'administrateur, puis ouvre le passage pour la durée de la requête.
CREATE OR REPLACE FUNCTION public.admin_require()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('globly.admin_op', '1', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_require() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Le journal des actions d'administration
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log (target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Journal : lecture admin" ON public.admin_audit_log;
CREATE POLICY "Journal : lecture admin" ON public.admin_audit_log FOR SELECT USING (public.current_user_is_admin());
-- Aucune règle d'écriture : ni ajout, ni modification, ni suppression par l'API.
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_log(p_action text, p_target_type text, p_target_id text, p_label text, p_details jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, target_label, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, left(p_label, 200), COALESCE(p_details, '{}'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.admin_log(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Journalise tout changement fait par un administrateur sur ce qui n'est pas à
-- lui. Arguments du déclencheur : colonne du propriétaire, colonne du libellé,
-- puis les colonnes à surveiller.
CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  changes jsonb := '{}'::jsonb;
  col text;
  i int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN RETURN NULL; END IF;
  IF (old_j ->> TG_ARGV[0]) = auth.uid()::text THEN RETURN NULL; END IF;  -- ses propres données

  IF TG_OP = 'DELETE' THEN
    PERFORM public.admin_log(TG_TABLE_NAME || '.delete', TG_TABLE_NAME, old_j ->> 'id', old_j ->> TG_ARGV[1], '{}'::jsonb);
    RETURN NULL;
  END IF;

  FOR i IN 2 .. TG_NARGS - 1 LOOP
    col := TG_ARGV[i];
    IF (old_j -> col) IS DISTINCT FROM (new_j -> col) THEN
      changes := changes || jsonb_build_object(col, jsonb_build_object('avant', old_j -> col, 'apres', new_j -> col));
    END IF;
  END LOOP;
  IF changes <> '{}'::jsonb THEN
    PERFORM public.admin_log(TG_TABLE_NAME || '.update', TG_TABLE_NAME, old_j ->> 'id', new_j ->> TG_ARGV[1], changes);
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------
-- 3) Suspension d'un compte
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE OR REPLACE FUNCTION public.current_user_is_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.suspended_at IS NOT NULL FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;

-- Un compte suspendu ne publie plus, ne modifie plus ses publications et
-- n'écrit plus à personne.
CREATE OR REPLACE FUNCTION public.block_suspended_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  -- Une modification faite par quelqu'un d'autre que le propriétaire de la
  -- ligne (un compteur, une action technique) ne concerne pas la suspension.
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) ? 'owner_id')
     AND (to_jsonb(OLD) ->> 'owner_id') IS DISTINCT FROM auth.uid()::text THEN
    RETURN NEW;
  END IF;
  IF public.current_user_is_suspended() THEN
    RAISE EXCEPTION 'Ce compte est suspendu. Contactez l''équipe Globly.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.listings;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.projects;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.search_ads;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT OR UPDATE ON public.search_ads FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.messages;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.ratings;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.connections;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();
DROP TRIGGER IF EXISTS trg_a_block_suspended ON public.project_interests;
CREATE TRIGGER trg_a_block_suspended BEFORE INSERT ON public.project_interests FOR EACH ROW EXECUTE FUNCTION public.block_suspended_writes();

-- Le membre ne peut pas lever lui-même sa suspension.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean := false;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p WHERE p.id = caller;

  -- Jamais modifiables depuis l'application en dehors des fonctions admin_*.
  -- (Nommer un admin se fait en SQL ; une formule change par le paiement ou
  -- par admin_set_plan ; une suspension par admin_suspend_user.)
  NEW.is_admin               := OLD.is_admin;
  NEW.plan_type              := OLD.plan_type;
  NEW.stripe_customer_id     := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.suspended_at           := OLD.suspended_at;
  NEW.suspended_reason       := OLD.suspended_reason;

  -- Niveau de qualification du repreneur : décidé par un admin
  IF NEW.buyer_level IS DISTINCT FROM OLD.buyer_level AND NOT caller_is_admin THEN
    NEW.buyer_level := OLD.buyer_level;
  END IF;

  -- KYC : le membre peut seulement DEMANDER la vérification (none/rejected
  -- → pending). C'est l'admin qui valide ou refuse.
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF caller_is_admin THEN
      NULL;
    ELSIF caller = OLD.id
      AND COALESCE(OLD.kyc_status, 'none') IN ('none', 'rejected')
      AND NEW.kyc_status = 'pending' THEN
      NULL;
    ELSE
      NEW.kyc_status := OLD.kyc_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Le membre sait s'il est suspendu (pour afficher le bandeau), sans rien d'autre.
CREATE OR REPLACE FUNCTION public.my_account_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('suspended', p.suspended_at IS NOT NULL, 'reason', p.suspended_reason)
  FROM public.profiles p WHERE p.id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_account_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_account_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user uuid, p_reason text, p_hide_content boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
BEGIN
  PERFORM public.admin_require();
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas suspendre votre propre compte' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND is_admin) THEN
    RAISE EXCEPTION 'Un administrateur ne peut pas être suspendu depuis l''application' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL OR char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'Indiquez le motif de la suspension' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET suspended_at = now(), suspended_reason = left(v_reason, 500) WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable' USING ERRCODE = '22023'; END IF;

  IF p_hide_content THEN
    -- Retirées de la vue du public. `inactive_since` reste vide : le nettoyage
    -- automatique des annonces en pause ne les supprimera pas.
    UPDATE public.listings SET status = 'inactive', inactive_since = NULL WHERE owner_id = p_user AND status <> 'inactive';
    UPDATE public.projects SET is_published = false WHERE owner_id = p_user AND is_published;
    UPDATE public.search_ads SET status = 'paused' WHERE owner_id = p_user AND status <> 'paused';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  UPDATE public.profiles SET suspended_at = NULL, suspended_reason = NULL WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 4) Actions de gestion
-- ---------------------------------------------------------------------
-- Offrir (ou retirer) une formule, sans paiement. N'agit pas sur Stripe : un
-- abonnement payant en cours continue d'être prélevé tant qu'il n'est pas résilié.
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user uuid, p_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_plan NOT IN ('free', 'pro', 'business') THEN RAISE EXCEPTION 'Formule inconnue' USING ERRCODE = '22023'; END IF;
  UPDATE public.profiles SET plan_type = p_plan WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_listing_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_status NOT IN ('active', 'inactive') THEN RAISE EXCEPTION 'Statut inconnu' USING ERRCODE = '22023'; END IF;
  UPDATE public.listings
     SET status = p_status,
         inactive_since = NULL,
         last_confirmed_at = CASE WHEN p_status = 'active' THEN now() ELSE last_confirmed_at END,
         renewal_requested_at = CASE WHEN p_status = 'active' THEN NULL ELSE renewal_requested_at END
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_project(p_id uuid, p_published boolean, p_verification text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_verification IS NOT NULL AND p_verification NOT IN ('non_soumis', 'en_attente', 'verifie', 'rejete') THEN
    RAISE EXCEPTION 'Statut de vérification inconnu' USING ERRCODE = '22023';
  END IF;
  UPDATE public.projects
     SET is_published = COALESCE(p_published, is_published),
         verification_status = COALESCE(p_verification, verification_status)
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Projet introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_search_ad_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_status NOT IN ('active', 'paused') THEN RAISE EXCEPTION 'Statut inconnu' USING ERRCODE = '22023'; END IF;
  UPDATE public.search_ads SET status = p_status WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recherche introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

-- Supprimer une publication (annonce, projet, recherche de repreneur).
CREATE OR REPLACE FUNCTION public.admin_delete_content(p_type text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_type = 'listing' THEN DELETE FROM public.listings WHERE id = p_id;
  ELSIF p_type = 'project' THEN DELETE FROM public.projects WHERE id = p_id;
  ELSIF p_type = 'search_ad' THEN DELETE FROM public.search_ads WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Type inconnu' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publication introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

-- Offrir une mise en avant (p_days jours à partir de maintenant), ou la retirer (0).
CREATE OR REPLACE FUNCTION public.admin_set_boost(p_type text, p_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz := CASE WHEN COALESCE(p_days, 0) > 0 THEN now() + make_interval(days => LEAST(p_days, 365)) ELSE NULL END;
BEGIN
  PERFORM public.admin_require();
  IF p_type = 'listing' THEN UPDATE public.listings SET boosted_until = v_until WHERE id = p_id;
  ELSIF p_type = 'project' THEN UPDATE public.projects SET boosted_until = v_until WHERE id = p_id;
  ELSIF p_type = 'search_ad' THEN UPDATE public.search_ads SET boosted_until = v_until WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Type inconnu' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publication introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

-- Avis : publier, refuser, supprimer, ou retirer une réponse déplacée.
CREATE OR REPLACE FUNCTION public.admin_moderate_rating(p_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require();
  IF p_action = 'publish' THEN UPDATE public.ratings SET status = 'published' WHERE id = p_id;
  ELSIF p_action = 'reject' THEN UPDATE public.ratings SET status = 'rejected' WHERE id = p_id;
  ELSIF p_action = 'clear_reply' THEN UPDATE public.ratings SET reply = NULL, replied_at = NULL WHERE id = p_id;
  ELSIF p_action = 'delete' THEN DELETE FROM public.ratings WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Action inconnue' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Avis introuvable' USING ERRCODE = '22023'; END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 5) Lectures réservées à l'administrateur
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'members', jsonb_build_object(
      'total', (SELECT count(*) FROM auth.users),
      'new_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
      'new_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
      'active_30d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '30 days'),
      'suspended', (SELECT count(*) FROM public.profiles WHERE suspended_at IS NOT NULL),
      'admins', (SELECT count(*) FROM public.profiles WHERE is_admin),
      'by_plan', (SELECT COALESCE(jsonb_object_agg(plan, n), '{}'::jsonb) FROM (SELECT COALESCE(plan_type, 'free') AS plan, count(*) AS n FROM public.profiles GROUP BY 1) s)
    ),
    'listings', jsonb_build_object(
      'total', (SELECT count(*) FROM public.listings),
      'active', (SELECT count(*) FROM public.listings WHERE status = 'active'),
      'inactive', (SELECT count(*) FROM public.listings WHERE status = 'inactive'),
      'pending_renewal', (SELECT count(*) FROM public.listings WHERE status = 'pending_renewal'),
      'boosted', (SELECT count(*) FROM public.listings WHERE boosted_until > now()),
      'new_30d', (SELECT count(*) FROM public.listings WHERE created_at > now() - interval '30 days'),
      'views', (SELECT count(*) FROM public.listing_views)
    ),
    'projects', jsonb_build_object(
      'total', (SELECT count(*) FROM public.projects),
      'published', (SELECT count(*) FROM public.projects WHERE is_published)
    ),
    'search_ads', jsonb_build_object(
      'total', (SELECT count(*) FROM public.search_ads),
      'active', (SELECT count(*) FROM public.search_ads WHERE status = 'active')
    ),
    'messages', jsonb_build_object(
      'total', (SELECT count(*) FROM public.messages),
      'last_7d', (SELECT count(*) FROM public.messages WHERE created_at > now() - interval '7 days')
    ),
    'todo', jsonb_build_object(
      'kyc', (SELECT count(*) FROM public.profiles WHERE kyc_status = 'pending'),
      'reports', (SELECT count(*) FROM public.reports WHERE status = 'pending'),
      'ratings', (SELECT count(*) FROM public.ratings WHERE status = 'under_review'),
      'projects', (SELECT count(*) FROM public.projects WHERE verification_status = 'en_attente'),
      'contact', (SELECT count(*) FROM public.contact_messages WHERE status = 'new')
    ),
    'revenue', jsonb_build_object(
      'unlocks_cents_total', (SELECT COALESCE(sum(amount_cents), 0) FROM public.listing_unlocks),
      'unlocks_cents_30d', (SELECT COALESCE(sum(amount_cents), 0) FROM public.listing_unlocks WHERE created_at > now() - interval '30 days'),
      'unlocks_count', (SELECT count(*) FROM public.listing_unlocks),
      'prospection_cents_total', (SELECT COALESCE(sum(amount_cents), 0) FROM public.prospection_contacts WHERE paid),
      'prospection_cents_30d', (SELECT COALESCE(sum(amount_cents), 0) FROM public.prospection_contacts WHERE paid AND created_at > now() - interval '30 days'),
      'subscribers', (SELECT count(*) FROM public.profiles WHERE stripe_subscription_id IS NOT NULL AND plan_type IN ('pro', 'business'))
    ),
    'series', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'day', to_char(d, 'YYYY-MM-DD'),
        'signups', (SELECT count(*) FROM auth.users u WHERE u.created_at >= d AND u.created_at < d + interval '1 day'),
        'listings', (SELECT count(*) FROM public.listings l WHERE l.created_at >= d AND l.created_at < d + interval '1 day'),
        'messages', (SELECT count(*) FROM public.messages m WHERE m.created_at >= d AND m.created_at < d + interval '1 day')
      ) ORDER BY d), '[]'::jsonb)
      FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- La liste des membres, avec ce que seule la base connaît : email, date
-- d'inscription, dernière connexion. p_filter : all, free, pro, business,
-- suspended, admins, kyc_pending, never_connected.
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL, p_filter text DEFAULT 'all', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := NULLIF(btrim(COALESCE(p_search, '')), '');
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           p.full_name, p.avatar_url, p.company_name, p.account_type, p.country, p.phone,
           COALESCE(p.plan_type, 'free') AS plan_type, COALESCE(p.kyc_status, 'none') AS kyc_status,
           COALESCE(p.is_admin, false) AS is_admin, p.buyer_level, p.suspended_at, p.suspended_reason,
           (p.stripe_subscription_id IS NOT NULL) AS has_subscription
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE (v_q IS NULL
           OR u.email ILIKE '%' || v_q || '%'
           OR p.full_name ILIKE '%' || v_q || '%'
           OR p.company_name ILIKE '%' || v_q || '%'
           OR u.id::text = v_q)
      AND CASE COALESCE(p_filter, 'all')
            WHEN 'free' THEN COALESCE(p.plan_type, 'free') = 'free'
            WHEN 'pro' THEN p.plan_type = 'pro'
            WHEN 'business' THEN p.plan_type = 'business'
            WHEN 'suspended' THEN p.suspended_at IS NOT NULL
            WHEN 'admins' THEN COALESCE(p.is_admin, false)
            WHEN 'kyc_pending' THEN p.kyc_status = 'pending'
            WHEN 'never_connected' THEN u.last_sign_in_at IS NULL
            ELSE true
          END
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'rows', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (
        SELECT b.*,
               (SELECT count(*) FROM public.listings l WHERE l.owner_id = b.id) AS listings_count,
               (SELECT count(*) FROM public.projects pr WHERE pr.owner_id = b.id) AS projects_count,
               (SELECT count(*) FROM public.search_ads s WHERE s.owner_id = b.id) AS search_ads_count
        FROM base b
        ORDER BY b.created_at DESC
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
      ) r), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- Tout ce que l'on sait d'un membre, sur une fiche.
CREATE OR REPLACE FUNCTION public.admin_user_detail(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'account', (SELECT jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
                         'email_confirmed_at', u.email_confirmed_at,
                         'two_factor', EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = u.id AND f.status = 'verified'))
                FROM auth.users u WHERE u.id = p_user),
    'profile', (SELECT to_jsonb(p) - 'stripe_customer_id' - 'stripe_subscription_id'
                       || jsonb_build_object('has_subscription', p.stripe_subscription_id IS NOT NULL)
                FROM public.profiles p WHERE p.id = p_user),
    'listings', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status, 'price', l.price,
                          'industry', l.industry, 'created_at', l.created_at, 'boosted_until', l.boosted_until) ORDER BY l.created_at DESC)
                          FROM public.listings l WHERE l.owner_id = p_user), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'title', pr.title, 'is_published', pr.is_published,
                          'verification_status', pr.verification_status, 'created_at', pr.created_at) ORDER BY pr.created_at DESC)
                          FROM public.projects pr WHERE pr.owner_id = p_user), '[]'::jsonb),
    'search_ads', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'created_at', s.created_at) ORDER BY s.created_at DESC)
                          FROM public.search_ads s WHERE s.owner_id = p_user), '[]'::jsonb),
    'activity', jsonb_build_object(
      'messages_sent', (SELECT count(*) FROM public.messages m WHERE m.sender_id = p_user),
      'ratings_received', (SELECT count(*) FROM public.ratings r WHERE r.rated_id = p_user AND r.status = 'published'),
      'ratings_avg', (SELECT round(avg(r.score)::numeric, 1) FROM public.ratings r WHERE r.rated_id = p_user AND r.status = 'published'),
      'reports_against', (SELECT count(*) FROM public.reports rp JOIN public.listings l ON l.id = rp.listing_id WHERE l.owner_id = p_user),
      'unlocks_bought', (SELECT count(*) FROM public.listing_unlocks x WHERE x.user_id = p_user),
      'spent_cents', (SELECT COALESCE(sum(x.amount_cents), 0) FROM public.listing_unlocks x WHERE x.user_id = p_user)
                     + (SELECT COALESCE(sum(c.amount_cents), 0) FROM public.prospection_contacts c WHERE c.user_id = p_user AND c.paid)
    ),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
                         FROM (SELECT * FROM public.admin_audit_log WHERE target_id = p_user::text ORDER BY created_at DESC LIMIT 20) a), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- Les achats ponctuels enregistrés en base (déblocages, contacts de prospection).
CREATE OR REPLACE FUNCTION public.admin_list_purchases(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT * FROM (
      SELECT 'unlock'::text AS kind, k.id::text AS id, k.user_id, k.created_at, k.amount_cents,
             k.target_type AS detail, k.target_id::text AS target_id,
             (SELECT p.full_name FROM public.profiles p WHERE p.id = k.user_id) AS member_name
      FROM public.listing_unlocks k
      UNION ALL
      SELECT 'prospection', c.id::text, c.user_id, c.created_at, c.amount_cents,
             c.company_name, c.siren,
             (SELECT p.full_name FROM public.profiles p WHERE p.id = c.user_id)
      FROM public.prospection_contacts c WHERE c.paid
    ) z
    ORDER BY z.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
  ) x;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- 6) Réglages publics du site (bandeau d'annonce)
-- ---------------------------------------------------------------------
-- Uniquement des informations faites pour être lues par tout le monde.
CREATE TABLE IF NOT EXISTS public.site_public_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.site_public_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Réglages publics : lecture" ON public.site_public_settings;
CREATE POLICY "Réglages publics : lecture" ON public.site_public_settings FOR SELECT USING (true);
REVOKE ALL ON public.site_public_settings FROM anon, authenticated;
GRANT SELECT ON public.site_public_settings TO anon, authenticated;

INSERT INTO public.site_public_settings (key, value)
VALUES ('announcement', '{"active": false, "text": "", "level": "info"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
BEGIN
  PERFORM public.admin_require();
  IF p_key NOT IN ('announcement') THEN RAISE EXCEPTION 'Réglage inconnu' USING ERRCODE = '22023'; END IF;
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' OR pg_column_size(p_value) > 4096 THEN
    RAISE EXCEPTION 'Valeur invalide' USING ERRCODE = '22023';
  END IF;
  SELECT value INTO v_old FROM public.site_public_settings WHERE key = p_key;
  INSERT INTO public.site_public_settings (key, value, updated_at, updated_by)
  VALUES (p_key, p_value, now(), auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();
  PERFORM public.admin_log('setting.update', 'setting', p_key, p_key, jsonb_build_object('avant', v_old, 'apres', p_value));
END;
$$;

-- ---------------------------------------------------------------------
-- 7) Ce qui est journalisé automatiquement
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.profiles;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('id', 'full_name', 'plan_type', 'kyc_status', 'buyer_level', 'suspended_at', 'suspended_reason', 'is_admin');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.listings;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('owner_id', 'name', 'status', 'boosted_until', 'is_premium');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.projects;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('owner_id', 'title', 'is_published', 'verification_status', 'boosted_until');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.search_ads;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.search_ads
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('owner_id', 'title', 'status', 'boosted_until');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.ratings;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('rater_id', 'comment', 'status', 'reply');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.reports;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('reporter_id', 'content', 'status');
DROP TRIGGER IF EXISTS trg_z_audit_admin ON public.contact_messages;
CREATE TRIGGER trg_z_audit_admin AFTER UPDATE OR DELETE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('user_id', 'subject', 'status');

-- ---------------------------------------------------------------------
-- 8) Qui peut appeler quoi
-- ---------------------------------------------------------------------
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'admin_suspend_user(uuid, text, boolean)', 'admin_unsuspend_user(uuid)', 'admin_set_plan(uuid, text)',
    'admin_set_listing_status(uuid, text)', 'admin_set_project(uuid, boolean, text)', 'admin_set_search_ad_status(uuid, text)',
    'admin_delete_content(text, uuid)', 'admin_set_boost(text, uuid, integer)', 'admin_moderate_rating(uuid, text)',
    'admin_overview()', 'admin_list_users(text, text, integer, integer)', 'admin_user_detail(uuid)',
    'admin_list_purchases(integer)', 'admin_set_setting(text, jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_suspended_writes() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
