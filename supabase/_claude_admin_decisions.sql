-- ════════════════════════════════════════════════════════════════════════════
-- DÉCISIONS EXPLIQUÉES AU MEMBRE
--
-- Quand un administrateur valide ou refuse une identité ou un projet, suspend
-- ou réactive un compte, le membre doit le savoir et, pour un refus, savoir
-- pourquoi. Chaque décision crée un « avis » :
--   • le membre le lit dans son espace (bandeau + rappel près de l'élément) ;
--   • la fonction notify-decision l'envoie par email (colonne email_status).
--
-- Un refus sans motif est refusé par la base.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS public.member_notices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN (
                  'kyc_verified', 'kyc_rejected', 'kyc_reset',
                  'project_verified', 'project_rejected',
                  'account_suspended', 'account_restored')),
  reason        text,
  target_type   text,
  target_id     uuid,
  target_label  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz,
  email_status  text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
  email_sent_at timestamptz,
  email_error   text
);
CREATE INDEX IF NOT EXISTS member_notices_user_idx ON public.member_notices (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_notices_pending_idx ON public.member_notices (created_at) WHERE email_status = 'pending';

ALTER TABLE public.member_notices ENABLE ROW LEVEL SECURITY;
-- Lecture : le membre concerné, ou un administrateur. Aucune écriture directe :
-- les avis sont créés par les fonctions ci-dessous et marqués lus par une RPC.
DROP POLICY IF EXISTS "Avis : lecture par le membre" ON public.member_notices;
CREATE POLICY "Avis : lecture par le membre" ON public.member_notices
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_is_admin());
REVOKE ALL ON public.member_notices FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.member_notices FROM authenticated;
GRANT SELECT ON public.member_notices TO authenticated;

-- Création d'un avis (interne).
CREATE OR REPLACE FUNCTION public.member_notice_add(p_user uuid, p_kind text, p_reason text, p_target_type text, p_target_id uuid, p_label text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.member_notices (user_id, kind, reason, target_type, target_id, target_label)
  VALUES (p_user, p_kind, NULLIF(btrim(COALESCE(p_reason, '')), ''), p_target_type, p_target_id, left(p_label, 200))
  RETURNING id;
$$;
REVOKE ALL ON FUNCTION public.member_notice_add(uuid, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;

-- Le membre marque ses avis comme lus (il ne peut toucher que les siens).
CREATE OR REPLACE FUNCTION public.mark_notices_read(p_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.member_notices SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL AND id = ANY (p_ids);
$$;
REVOKE ALL ON FUNCTION public.mark_notices_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notices_read(uuid[]) TO authenticated;

-- ── Identité ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_decide_kyc(p_user uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_old text;
BEGIN
  PERFORM public.admin_require();
  IF p_status NOT IN ('verified', 'rejected', 'none') THEN
    RAISE EXCEPTION 'Statut d''identité inconnu' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'rejected' AND (v_reason IS NULL OR char_length(v_reason) < 10) THEN
    RAISE EXCEPTION 'Indiquez le motif du refus (10 caractères au moins) : il est transmis au membre' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(kyc_status, 'none') INTO v_old FROM public.profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable' USING ERRCODE = '22023'; END IF;
  IF v_old = p_status THEN RETURN NULL; END IF;
  UPDATE public.profiles SET kyc_status = p_status WHERE id = p_user;
  RETURN public.member_notice_add(
    p_user,
    CASE p_status WHEN 'verified' THEN 'kyc_verified' WHEN 'rejected' THEN 'kyc_rejected' ELSE 'kyc_reset' END,
    v_reason, 'profile', p_user, NULL);
END;
$$;

-- ── Projet ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_decide_project(p_id uuid, p_verification text, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_owner uuid;
  v_title text;
  v_old text;
BEGIN
  PERFORM public.admin_require();
  IF p_verification NOT IN ('non_soumis', 'en_attente', 'verifie', 'rejete') THEN
    RAISE EXCEPTION 'Statut de vérification inconnu' USING ERRCODE = '22023';
  END IF;
  IF p_verification = 'rejete' AND (v_reason IS NULL OR char_length(v_reason) < 10) THEN
    RAISE EXCEPTION 'Indiquez le motif du refus (10 caractères au moins) : il est transmis au porteur du projet' USING ERRCODE = '22023';
  END IF;
  SELECT owner_id, title, COALESCE(verification_status, 'non_soumis') INTO v_owner, v_title, v_old
    FROM public.projects WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Projet introuvable' USING ERRCODE = '22023'; END IF;
  IF v_old = p_verification THEN RETURN NULL; END IF;
  UPDATE public.projects SET verification_status = p_verification WHERE id = p_id;
  IF p_verification NOT IN ('verifie', 'rejete') OR v_owner IS NULL THEN RETURN NULL; END IF;
  RETURN public.member_notice_add(
    v_owner, CASE p_verification WHEN 'verifie' THEN 'project_verified' ELSE 'project_rejected' END,
    v_reason, 'project', p_id, v_title);
END;
$$;

-- ── Suspension : l'avis suit le changement, d'où qu'il vienne ───────────────
CREATE OR REPLACE FUNCTION public.notice_on_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.suspended_at IS NULL AND NEW.suspended_at IS NOT NULL THEN
    PERFORM public.member_notice_add(NEW.id, 'account_suspended', NEW.suspended_reason, 'profile', NEW.id, NULL);
  ELSIF OLD.suspended_at IS NOT NULL AND NEW.suspended_at IS NULL THEN
    PERFORM public.member_notice_add(NEW.id, 'account_restored', NULL, 'profile', NEW.id, NULL);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.notice_on_suspension() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notice_suspension ON public.profiles;
CREATE TRIGGER trg_notice_suspension AFTER UPDATE OF suspended_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notice_on_suspension();

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['admin_decide_kyc(uuid, text, text)', 'admin_decide_project(uuid, text, text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
