-- =====================================================================
-- DURCISSEMENT 2 — octobre 2026
-- =====================================================================
-- Ferme ce que l'audit du 10/10/2026 a trouvé ouvert sur la base réelle :
--
--   1. public.secret() était appelable par un visiteur anonyme (le REVOKE
--      d'origine oubliait PUBLIC) : il pouvait lire la clé service_role.
--   2. Le contenu payant des projets et des annonces de recherche était
--      envoyé à tout le monde, puis simplement flouté à l'écran.
--   3. Plusieurs règles « par ligne » laissaient modifier des colonnes qui
--      ne regardent pas l'appelant : contenu/statut d'une offre reçue,
--      demande de relation acceptée par son auteur, note remise en ligne
--      par son auteur, compteur de quota effacé, intérêt auto-accepté.
--   4. Un admin ne pouvait en réalité ni valider un KYC ni vérifier un
--      projet (aucune règle ne lui laissait lire la ligne à modifier).
--   5. Compteurs de vues et journal de la data room falsifiables.
--
-- À coller dans la page Supabase d'Orbit (ou Supabase Studio > SQL Editor).
-- Idempotent, et dans une seule transaction : en cas d'erreur, RIEN n'est
-- appliqué.
--
-- ⚠️ APRÈS ce patch : régénérer la clé service_role (Supabase > Project
-- Settings > API) et RECONCILE_KEY, puis les redéposer dans le coffre
-- (vault) et les secrets des fonctions. Elles ont été lisibles par
-- n'importe qui depuis le 22/09 : il faut les considérer comme compromises.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Fonctions exposées par erreur
-- ---------------------------------------------------------------------
-- Postgres accorde EXECUTE à PUBLIC par défaut : retirer le droit à anon et
-- authenticated ne suffit pas, ils en héritent par PUBLIC.
REVOKE ALL ON FUNCTION public.secret(text) FROM PUBLIC, anon, authenticated;

-- Le cycle de vie des annonces (qui SUPPRIME les annonces en pause depuis
-- 30 jours) n'a pas à être déclenchable depuis l'API : seul le cron l'appelle.
REVOKE ALL ON FUNCTION public.process_listing_lifecycle() FROM PUBLIC, anon, authenticated;

-- Table de référence de PostGIS, sans RLS : aucune raison de l'exposer.
REVOKE ALL ON public.spatial_ref_sys FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Fonctions d'aide (lecture de SES PROPRES droits, rien d'autre)
-- ---------------------------------------------------------------------
-- SECURITY DEFINER : elles lisent profiles/listing_unlocks sans repasser par
-- les règles RLS — indispensable pour être utilisées DANS une règle de
-- `profiles` sans récursion infinie. Elles ne renvoient qu'un booléen sur
-- l'appelant lui-même.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_paid()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.plan_type FROM public.profiles p WHERE p.id = auth.uid()), 'free')
         IN ('pro', 'business')
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_unlock(p_type text, p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listing_unlocks u
    WHERE u.user_id = auth.uid() AND u.target_type = p_type AND u.target_id = p_id
  )
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_paid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_has_unlock(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_paid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_unlock(text, uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3) Admin : lire les profils et modérer les projets
-- ---------------------------------------------------------------------
-- Un UPDATE ... WHERE id = <autre> ne touche que les lignes que l'appelant a
-- le droit de LIRE. Depuis le durcissement de juillet, seul « son propre
-- profil » était lisible : valider un KYC modifiait donc 0 ligne, en silence.
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins moderate projects" ON public.projects;
CREATE POLICY "Admins moderate projects"
  ON public.projects FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- L'ancien trigger de vérification des projets faisait doublon avec
-- trg_protect_project_privileges et, sans exception pour service_role,
-- annulait en silence une vérification faite depuis l'éditeur SQL.
DROP TRIGGER IF EXISTS trg_protect_project_verification ON public.projects;
DROP FUNCTION IF EXISTS public.protect_project_verification();
-- Fonction orpheline (son trigger a été retiré le 22/09).
DROP TRIGGER IF EXISTS trg_protect_buyer_level ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_buyer_level();

-- ---------------------------------------------------------------------
-- 4) Projets : le contenu payant ne quitte plus le serveur
-- ---------------------------------------------------------------------
-- Même principe que listings_secure. La table n'est plus lisible en entier
-- que par le porteur, un admin, ou un membre qui y a droit (formule payante
-- ou déblocage à 5 €). Tous les autres passent par la vue `projects_secure`,
-- qui renvoie la vitrine (titre, accroche, secteur, ville, types d'aide…) et
-- met à NULL le dossier (description, budget, financement, équipe, matériel).
DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
DROP POLICY IF EXISTS "Projets : lecture complète" ON public.projects;
CREATE POLICY "Projets : lecture complète"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.current_user_is_admin()
    OR (is_published = true AND (public.current_user_is_paid() OR public.current_user_has_unlock('project', id)))
  );

CREATE OR REPLACE VIEW public.projects_secure
WITH (security_invoker = false) AS
SELECT
  p.id, p.owner_id, p.title, p.tagline, p.category, p.stage, p.country, p.city,
  p.website_url, p.cover_image_url, p.help_types,
  p.financial_needed, p.human_needed, p.material_needed, p.expertise_needed, p.network_needed,
  p.budget_currency, p.view_count, p.interest_count, p.is_published, p.is_urgent, p.deadline,
  p.created_at, p.updated_at, p.verification_status, p.boosted_until,
  -- Dossier : réservé au porteur, à l'admin, aux formules payantes et aux déblocages
  CASE WHEN g.full_ok THEN p.description       END AS description,
  CASE WHEN g.full_ok THEN p.budget_min        END AS budget_min,
  CASE WHEN g.full_ok THEN p.budget_max        END AS budget_max,
  CASE WHEN g.full_ok THEN p.investment_type   END AS investment_type,
  CASE WHEN g.full_ok THEN p.equity_offered    END AS equity_offered,
  CASE WHEN g.full_ok THEN p.team_roles        END AS team_roles,
  CASE WHEN g.full_ok THEN p.material_items    END AS material_items,
  CASE WHEN g.full_ok THEN p.expertise_domains END AS expertise_domains,
  CASE WHEN g.full_ok THEN p.apport_personnel  END AS apport_personnel,
  CASE WHEN g.full_ok THEN p.funds_usage       END AS funds_usage,
  CASE WHEN g.full_ok THEN p.revenue_current   END AS revenue_current,
  CASE WHEN g.full_ok THEN p.revenue_forecast  END AS revenue_forecast,
  CASE WHEN g.full_ok THEN p.financing_types   END AS financing_types,
  -- Amorce publique : de quoi donner envie d'ouvrir la fiche, pas le dossier
  CASE WHEN char_length(p.description) > 140
       THEN left(p.description, 140) || '…' ELSE p.description END AS description_excerpt,
  g.full_ok AS has_full_access,
  -- Porteur (informations déjà publiques via safe_profiles)
  o.full_name  AS owner_full_name,
  o.avatar_url AS owner_avatar_url,
  o.kyc_status AS owner_kyc_status
FROM public.projects p
LEFT JOIN public.profiles o ON o.id = p.owner_id
CROSS JOIN LATERAL (
  -- COALESCE : pour un anonyme auth.uid() vaut NULL, et `owner_id = NULL`
  -- donne NULL (ni vrai ni faux) — on veut un vrai « non ».
  SELECT COALESCE(
    p.owner_id = auth.uid()
    OR public.current_user_is_admin()
    OR public.current_user_is_paid()
    OR public.current_user_has_unlock('project', p.id)
  , false) AS full_ok
) g
WHERE p.is_published = true
   OR p.owner_id = auth.uid()
   OR public.current_user_is_admin();

GRANT SELECT ON public.projects_secure TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) Annonces de recherche (repreneurs) : idem pour le descriptif
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Active search ads are public" ON public.search_ads;
DROP POLICY IF EXISTS "Recherches : lecture complète" ON public.search_ads;
CREATE POLICY "Recherches : lecture complète"
  ON public.search_ads FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.current_user_is_admin()
    OR (status = 'active' AND (public.current_user_is_paid() OR public.current_user_has_unlock('search_ad', id)))
  );

CREATE OR REPLACE VIEW public.search_ads_secure
WITH (security_invoker = false) AS
SELECT
  s.id, s.owner_id, s.title, s.buyer_type, s.sectors, s.regions, s.revenue_range, s.budget,
  s.apport_available, s.bank_financing, s.status, s.created_at, s.updated_at, s.boosted_until,
  CASE WHEN g.full_ok THEN s.description END AS description,
  (s.description IS NOT NULL AND s.description <> '') AS has_description,
  g.full_ok AS has_full_access
FROM public.search_ads s
CROSS JOIN LATERAL (
  SELECT COALESCE(
    s.owner_id = auth.uid()
    OR public.current_user_is_admin()
    OR public.current_user_is_paid()
    OR public.current_user_has_unlock('search_ad', s.id)
  , false) AS full_ok
) g
WHERE s.status = 'active'
   OR s.owner_id = auth.uid()
   OR public.current_user_is_admin();

GRANT SELECT ON public.search_ads_secure TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Annonces : SIRET masqué quand le vendeur l'a demandé, annonces en
--    pause invisibles
-- ---------------------------------------------------------------------
-- Jusqu'ici « masquer le SIRET » n'était qu'un affichage : la valeur partait
-- quand même au navigateur. Et une annonce en pause restait lisible par tous.
-- Même liste et même ordre de colonnes que la vue d'origine (obligatoire pour
-- CREATE OR REPLACE VIEW).
CREATE OR REPLACE VIEW public.listings_secure
WITH (security_invoker = false) AS
SELECT
  l.id, l.name,
  CASE WHEN COALESCE(l.hide_siret, false) AND NOT (acc.is_admin OR acc.is_owner)
       THEN NULL ELSE l.siret END AS siret,
  l.industry, l.address, l.lat, l.lng, l.location,
  l.price, l.rent, l.employees, l.surface,
  l.created_at, l.owner_id, l.logo_url, l.website_url, l.hide_siret, l.image_urls,
  l.established_year, l.requires_nda, l.management_type, l.client_concentration,
  l.digital_maturity, l.market_trend, l.is_premium, l.updated_at, l.status,
  l.last_confirmed_at, l.renewal_requested_at, l.inactive_since,
  l.renewal_reminder_sent_at, l.boosted_until, l.share_financials,
  CASE WHEN g.fin_ok  THEN l.revenue_n1 END AS revenue_n1,
  CASE WHEN g.fin_ok  THEN l.revenue_n2 END AS revenue_n2,
  CASE WHEN g.fin_ok  THEN l.revenue_n3 END AS revenue_n3,
  CASE WHEN g.fin_ok  THEN l.ebitda     END AS ebitda,
  CASE WHEN g.full_ok THEN l.description        END AS description,
  CASE WHEN g.full_ok THEN l.reason_for_selling END AS reason_for_selling,
  CASE WHEN g.full_ok THEN l.lease_details      END AS lease_details,
  (SELECT count(*) FROM public.listing_views v WHERE v.listing_id = l.id) AS view_count,
  (SELECT count(*) FROM public.favorites f WHERE f.listing_id = l.id) AS favorites_count
FROM public.listings l
CROSS JOIN LATERAL (
  SELECT
    public.current_user_is_admin() AS is_admin,
    -- COALESCE indispensable : sans lui, un anonyme (auth.uid() NULL) rendait
    -- le test du SIRET masqué indéterminé, et le SIRET sortait quand même.
    COALESCE(l.owner_id = auth.uid(), false) AS is_owner,
    public.current_user_is_paid() AS is_paid,
    public.current_user_has_unlock('listing', l.id) AS is_unlocked
) acc
CROSS JOIN LATERAL (
  SELECT
    (acc.is_admin OR acc.is_owner OR acc.is_paid OR acc.is_unlocked) AS full_ok,
    (acc.is_admin OR acc.is_owner
       OR ((acc.is_paid OR acc.is_unlocked) AND COALESCE(l.share_financials, false))) AS fin_ok
) g
WHERE l.status <> 'inactive' OR acc.is_owner OR acc.is_admin;

GRANT SELECT ON public.listings_secure TO anon, authenticated;

-- La colonne restait lisible directement sur la table.
REVOKE SELECT (siret) ON public.listings FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) Profils publics : coordonnées réservées aux formules payantes
-- ---------------------------------------------------------------------
-- La règle « afficher mon email / téléphone = formule payante » n'existait
-- que dans l'interface. Même liste et même ordre de colonnes qu'avant.
CREATE OR REPLACE VIEW public.safe_profiles
WITH (security_invoker = false) AS
SELECT
  id, full_name, avatar_url, bio, show_email, show_phone, updated_at, is_admin, kyc_status,
  plan_type AS plan,
  CASE WHEN (show_email = true AND plan_type IN ('pro', 'business'))
            OR auth.uid() = id OR public.current_user_is_admin()
       THEN contact_email ELSE NULL::text END AS contact_email,
  CASE WHEN (show_phone = true AND plan_type IN ('pro', 'business'))
            OR auth.uid() = id OR public.current_user_is_admin()
       THEN phone ELSE NULL::text END AS phone,
  plan_type,
  buyer_type, buyer_level, target_sectors, target_geo, target_budget, target_revenue, apport, experience, ambitions,
  (SELECT count(*) FROM profile_views v WHERE v.profile_id = p.id) AS profile_views_count,
  account_type, company_name, legal_form, role_function, country
FROM profiles p;

GRANT SELECT ON public.safe_profiles TO authenticated, anon;

-- ---------------------------------------------------------------------
-- 8) Messages : chacun ne modifie que ce qui le regarde
-- ---------------------------------------------------------------------
-- La règle « expéditeur OU destinataire peut modifier » valait pour TOUTES les
-- colonnes : le destinataire d'une offre pouvait en réécrire le montant, et
-- l'expéditeur se l'accepter lui-même. Désormais :
--   - destinataire : marquer comme lu ; accepter ou refuser une offre en
--     attente. Rien d'autre.
--   - expéditeur : corriger son message ou son offre tant qu'elle est en
--     attente. Jamais décider du statut, jamais toucher à « lu ».
-- Comme pour les autres protections : la valeur d'origine est rétablie en
-- silence, aucun écran existant ne casse.
CREATE OR REPLACE FUNCTION public.protect_message_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  has_status boolean;
  old_status text;
  new_status text;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_read := false;
    -- On ne s'envoie pas une offre déjà acceptée.
    IF NEW.metadata IS NOT NULL AND NEW.metadata ? 'status' THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{status}', '"pending"'::jsonb);
    END IF;
    RETURN NEW;
  END IF;

  NEW.id          := OLD.id;
  NEW.sender_id   := OLD.sender_id;
  NEW.receiver_id := OLD.receiver_id;
  NEW.listing_id  := OLD.listing_id;
  NEW.project_id  := OLD.project_id;
  NEW.created_at  := OLD.created_at;
  NEW.type        := OLD.type;

  has_status := COALESCE(OLD.type IN ('offer', 'need_offer'), false)
                OR COALESCE(OLD.metadata ? 'status', false);
  old_status := COALESCE(OLD.metadata ->> 'status', 'pending');
  new_status := COALESCE(NEW.metadata ->> 'status', 'pending');

  IF caller = OLD.receiver_id AND caller IS DISTINCT FROM OLD.sender_id THEN
    NEW.content := OLD.content;
    IF has_status AND old_status = 'pending' AND new_status IN ('accepted', 'declined') THEN
      NEW.metadata := jsonb_set(COALESCE(OLD.metadata, '{}'::jsonb), '{status}', to_jsonb(new_status));
    ELSE
      NEW.metadata := OLD.metadata;
    END IF;

  ELSIF caller = OLD.sender_id THEN
    NEW.is_read := OLD.is_read;
    IF has_status THEN
      IF old_status <> 'pending' THEN
        -- Offre déjà acceptée ou refusée : elle est figée.
        NEW.content  := OLD.content;
        NEW.metadata := OLD.metadata;
      ELSIF NEW.metadata IS NOT NULL THEN
        NEW.metadata := jsonb_set(NEW.metadata, '{status}', '"pending"'::jsonb);
      END IF;
    ELSIF NEW.metadata IS NOT NULL AND NEW.metadata ? 'status' THEN
      -- Un message ordinaire ne devient pas une offre acceptée après coup.
      NEW.metadata := NEW.metadata - 'status';
    END IF;

  ELSE
    NEW.content  := OLD.content;
    NEW.metadata := OLD.metadata;
    NEW.is_read  := OLD.is_read;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_columns ON public.messages;
CREATE TRIGGER trg_protect_message_columns
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_message_columns();

-- ---------------------------------------------------------------------
-- 9) Relations : seul le destinataire accepte
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_connection_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  NEW.requester_id := OLD.requester_id;
  NEW.recipient_id := OLD.recipient_id;
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS DISTINCT FROM OLD.recipient_id THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_connection_columns ON public.connections;
CREATE TRIGGER trg_protect_connection_columns
  BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.protect_connection_columns();

-- ---------------------------------------------------------------------
-- 10) Notes : la modération appartient à l'admin
-- ---------------------------------------------------------------------
-- L'auteur d'une note mise en modération pouvait la republier lui-même.
-- (Le trigger trg_moderate_low_rating passe avant celui-ci — ordre
-- alphabétique — d'où la reprise de sa règle ici pour ne pas l'annuler.)
CREATE OR REPLACE FUNCTION public.protect_rating_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() OR public.current_user_is_admin() THEN RETURN NEW; END IF;

  NEW.rater_id := OLD.rater_id;
  NEW.rated_id := OLD.rated_id;
  IF NEW.score < 2.5 THEN
    NEW.status := 'under_review';
  ELSE
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rating_status ON public.ratings;
CREATE TRIGGER trg_protect_rating_status
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.protect_rating_status();

-- ---------------------------------------------------------------------
-- 11) Intérêts pour un projet : seul le porteur répond
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_project_interest_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  NEW.project_id := OLD.project_id;
  NEW.user_id    := OLD.user_id;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT EXISTS (
      SELECT 1 FROM public.projects pr WHERE pr.id = OLD.project_id AND pr.owner_id = auth.uid()
    ) INTO is_owner;
    IF NOT is_owner THEN NEW.status := OLD.status; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_project_interest_status ON public.project_interests;
CREATE TRIGGER trg_protect_project_interest_status
  BEFORE INSERT OR UPDATE ON public.project_interests
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_interest_status();

-- ---------------------------------------------------------------------
-- 12) Quota de contacts : on ne remet pas son compteur à zéro
-- ---------------------------------------------------------------------
-- La règle FOR ALL laissait supprimer ses propres lignes, donc repartir de 0.
DROP POLICY IF EXISTS "Users manage their own initiations" ON public.conversation_initiations;

DROP POLICY IF EXISTS "Initiations : lecture des siennes" ON public.conversation_initiations;
CREATE POLICY "Initiations : lecture des siennes"
  ON public.conversation_initiations FOR SELECT
  USING (initiator_id = auth.uid());

DROP POLICY IF EXISTS "Initiations : enregistrement" ON public.conversation_initiations;
CREATE POLICY "Initiations : enregistrement"
  ON public.conversation_initiations FOR INSERT
  WITH CHECK (
    initiator_id = auth.uid()
    AND year_month = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM')
  );

-- ---------------------------------------------------------------------
-- 13) Vues et journal d'accès : on ne signe qu'en son nom
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can record a view" ON public.listing_views;
DROP POLICY IF EXISTS "Vues d'annonce : en son nom" ON public.listing_views;
CREATE POLICY "Vues d'annonce : en son nom"
  ON public.listing_views FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can record profile view" ON public.profile_views;
DROP POLICY IF EXISTS "Vues de profil : en son nom" ON public.profile_views;
CREATE POLICY "Vues de profil : en son nom"
  ON public.profile_views FOR INSERT
  WITH CHECK (viewer_id = auth.uid() AND profile_id <> auth.uid());

DROP POLICY IF EXISTS "Anyone can log access" ON public.vdr_access_logs;
DROP POLICY IF EXISTS "Journal data room : en son nom" ON public.vdr_access_logs;
CREATE POLICY "Journal data room : en son nom"
  ON public.vdr_access_logs FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- ---------------------------------------------------------------------
-- 14) Formulaire de contact (il n'envoyait rien)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200 AND position('@' IN email) > 1),
  subject text CHECK (subject IS NULL OR char_length(subject) <= 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut écrire (même sans compte) ; seul un admin lit et classe.
DROP POLICY IF EXISTS "Contact : envoi" ON public.contact_messages;
CREATE POLICY "Contact : envoi"
  ON public.contact_messages FOR INSERT
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND status = 'new');

DROP POLICY IF EXISTS "Contact : lecture admin" ON public.contact_messages;
CREATE POLICY "Contact : lecture admin"
  ON public.contact_messages FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Contact : suivi admin" ON public.contact_messages;
CREATE POLICY "Contact : suivi admin"
  ON public.contact_messages FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================
-- Contrôles à lancer ensuite (lecture seule) — chaque ligne doit dire false,
-- et la dernière requête ne doit lister AUCUN trigger d'auto-confirmation.
-- =====================================================================
-- select has_function_privilege('anon', 'public.secret(text)', 'execute');
-- select has_function_privilege('authenticated', 'public.secret(text)', 'execute');
-- select has_function_privilege('anon', 'public.process_listing_lifecycle()', 'execute');
-- select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- select policyname, cmd, qual, with_check from pg_policies where schemaname = 'storage' order by 1;

-- =====================================================================
-- Stockage — hors transaction principale (schéma `storage`).
-- =====================================================================
-- Images d'annonces : la règle d'origine (« Upload Images ») laissait n'importe
-- qui, même sans compte, déposer des fichiers dans ce bucket public. Désormais
-- il faut être connecté et écrire dans son propre dossier (<uid>/…), ce que
-- fait déjà l'application.
DROP POLICY IF EXISTS "Upload Images m9jfjj_0" ON storage.objects;
DROP POLICY IF EXISTS "Annonces : dépôt dans son dossier" ON storage.objects;
CREATE POLICY "Annonces : dépôt dans son dossier"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Justificatifs KYC : dépôt dans son propre dossier (kyc/<uid>/…) uniquement,
-- et suppression de ses anciens fichiers pour qu'un nouvel envoi les remplace.
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "KYC : dépôt dans son dossier" ON storage.objects;
CREATE POLICY "KYC : dépôt dans son dossier"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'kyc'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "KYC : suppression de ses fichiers" ON storage.objects;
CREATE POLICY "KYC : suppression de ses fichiers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND owner = auth.uid());
