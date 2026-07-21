-- ============================================================
-- GLOBLY V2 — SCRIPT COMPLET (à coller UNE FOIS dans
-- Supabase Studio > SQL Editor, puis Run). Idempotent :
-- vous pouvez le rejouer sans risque.
-- Regroupe : cycle de vie annonces, premium vendeur, notation,
-- profils acheteurs, recherches de reprise + freemium,
-- espace partenaire, place projets.
-- ============================================================


-- ################################################################
-- ## _claude_listing_lifecycle
-- ################################################################
-- ============================================================
-- CYCLE DE VIE DES ANNONCES (vendeur)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
-- Règles métier :
--  1. Annonce gratuite, active par défaut.
--  2. Tous les 90 jours, relance au vendeur (email via l'edge
--     function `renewal-reminder` + bannière dans le Dashboard).
--  3. Sans confirmation sous 10 jours -> statut 'inactive'
--     (plus visible sur le site, messagerie toujours accessible).
--  4. Le vendeur peut réactiver gratuitement à tout moment.
--  5. Après 30 jours d'inactivité -> suppression automatique.
--
-- Après avoir exécuté ce fichier :
--  - Déployer l'edge function :  supabase functions deploy renewal-reminder
--  - Planifier son appel quotidien (Dashboard > Integrations > Cron),
--    ou laisser uniquement la bannière in-app si l'email n'est pas prêt.
-- ============================================================

-- 1) Colonnes de cycle de vie
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS renewal_requested_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS inactive_since timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at timestamptz;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('active', 'pending_renewal', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);

-- Backfill : les annonces existantes repartent d'un cycle complet
-- (updated_at peut ne pas exister sur certaines bases -> on l'ajoute)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.listings
SET last_confirmed_at = COALESCE(updated_at, created_at, now())
WHERE last_confirmed_at IS NULL;

-- 2) Transitions quotidiennes
CREATE OR REPLACE FUNCTION public.process_listing_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 90 jours sans confirmation -> demande de renouvellement
  UPDATE public.listings
  SET status = 'pending_renewal',
      renewal_requested_at = now(),
      renewal_reminder_sent_at = NULL
  WHERE status = 'active'
    AND last_confirmed_at < now() - interval '90 days';

  -- 10 jours sans réponse à la relance -> annonce en pause
  UPDATE public.listings
  SET status = 'inactive',
      inactive_since = now()
  WHERE status = 'pending_renewal'
    AND renewal_requested_at < now() - interval '10 days';

  -- 30 jours en pause -> suppression définitive
  DELETE FROM public.listings
  WHERE status = 'inactive'
    AND inactive_since < now() - interval '30 days';
END;
$$;

-- 3) Confirmation / réactivation en 1 clic par le propriétaire
CREATE OR REPLACE FUNCTION public.confirm_listing_active(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET status = 'active',
      last_confirmed_at = now(),
      renewal_requested_at = NULL,
      inactive_since = NULL,
      renewal_reminder_sent_at = NULL
  WHERE id = p_listing_id
    AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable ou non autorisée';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_listing_active(uuid) TO authenticated;

-- 4) Planification quotidienne (pg_cron est disponible sur Supabase Cloud)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'listing-lifecycle') THEN
    PERFORM cron.unschedule('listing-lifecycle');
  END IF;
END;
$$;

SELECT cron.schedule('listing-lifecycle', '0 3 * * *', $$SELECT public.process_listing_lifecycle()$$);

-- ################################################################
-- ## _claude_premium_vendeur
-- ################################################################
-- ============================================================
-- PREMIUM VENDEUR
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - listings.is_premium : mise en avant (tri prioritaire + badge)
--    synchronisé automatiquement avec le plan du propriétaire.
--  - profiles.ape_code : code APE du vendeur, obligatoire pour la
--    prospection Radar (bridée à son propre secteur).
--  - RLS : le propriétaire d'une annonce peut voir QUI l'a mise
--    en favori (fonctionnalité premium « qui a vu / aimé »).
-- ============================================================

-- 1) Colonnes
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ape_code text;

CREATE INDEX IF NOT EXISTS idx_listings_is_premium ON public.listings(is_premium) WHERE is_premium;

-- 2) is_premium suit le plan du propriétaire
CREATE OR REPLACE FUNCTION public.sync_listing_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(plan_type = 'premium', false) INTO NEW.is_premium
  FROM public.profiles WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_listing_premium ON public.listings;
CREATE TRIGGER trg_sync_listing_premium
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_premium();

-- Quand un profil passe premium (ou le perd), ses annonces suivent
CREATE OR REPLACE FUNCTION public.sync_owner_listings_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.plan_type, '') IS DISTINCT FROM COALESCE(OLD.plan_type, '') THEN
    UPDATE public.listings
    SET is_premium = (NEW.plan_type = 'premium')
    WHERE owner_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_owner_listings_premium ON public.profiles;
CREATE TRIGGER trg_sync_owner_listings_premium
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_owner_listings_premium();

-- Synchronisation initiale
UPDATE public.listings l
SET is_premium = (p.plan_type = 'premium')
FROM public.profiles p
WHERE p.id = l.owner_id
  AND l.is_premium IS DISTINCT FROM (p.plan_type = 'premium');

-- 3) Le propriétaire d'une annonce voit qui l'a mise en favori
DROP POLICY IF EXISTS "Listing owners can view favorites on their listings" ON public.favorites;
CREATE POLICY "Listing owners can view favorites on their listings"
  ON public.favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = favorites.listing_id AND l.owner_id = auth.uid()
    )
  );

-- ################################################################
-- ## _claude_ratings
-- ################################################################
-- ============================================================
-- NOTATION ENTRE MEMBRES (sur 5)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - Seules les personnes ayant échangé des messages peuvent se noter.
--  - Note < 2.5 : justification obligatoire (min 20 caractères) et la
--    note part en modération ('under_review') avant publication.
--  - Les mieux notés (moyenne >= 4.5, >= 3 avis publiés) obtiennent la
--    pastille verte « membre fiable » côté interface.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric(2,1) NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  justification text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'under_review', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ratings_no_self CHECK (rater_id <> rated_id),
  CONSTRAINT ratings_low_score_justified CHECK (score >= 2.5 OR (justification IS NOT NULL AND length(justification) >= 20)),
  UNIQUE (rater_id, rated_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_rated ON public.ratings(rated_id) WHERE status = 'published';

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Les notes basses partent en modération automatiquement
CREATE OR REPLACE FUNCTION public.moderate_low_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.score < 2.5 THEN
    NEW.status := 'under_review';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moderate_low_rating ON public.ratings;
CREATE TRIGGER trg_moderate_low_rating
  BEFORE INSERT OR UPDATE OF score ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.moderate_low_rating();

-- RLS
DROP POLICY IF EXISTS "Published ratings are readable" ON public.ratings;
CREATE POLICY "Published ratings are readable"
  ON public.ratings FOR SELECT
  USING (
    status = 'published'
    OR rater_id = auth.uid()
    OR rated_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

-- On ne peut noter que quelqu'un avec qui on a échangé des messages
DROP POLICY IF EXISTS "Members can rate people they interacted with" ON public.ratings;
CREATE POLICY "Members can rate people they interacted with"
  ON public.ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = rated_id)
         OR (m.sender_id = rated_id AND m.receiver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Raters can update their own rating" ON public.ratings;
CREATE POLICY "Raters can update their own rating"
  ON public.ratings FOR UPDATE
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

DROP POLICY IF EXISTS "Raters can delete their own rating" ON public.ratings;
CREATE POLICY "Raters can delete their own rating"
  ON public.ratings FOR DELETE
  USING (rater_id = auth.uid());

DROP POLICY IF EXISTS "Admins can moderate ratings" ON public.ratings;
CREATE POLICY "Admins can moderate ratings"
  ON public.ratings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "Admins can delete ratings" ON public.ratings;
CREATE POLICY "Admins can delete ratings"
  ON public.ratings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- Résumé public des notes (moyenne + nombre d'avis publiés)
CREATE OR REPLACE VIEW public.user_ratings_summary AS
SELECT
  rated_id AS user_id,
  round(avg(score), 1) AS avg_score,
  count(*) AS rating_count
FROM public.ratings
WHERE status = 'published'
GROUP BY rated_id;

GRANT SELECT ON public.user_ratings_summary TO authenticated, anon;

-- ################################################################
-- ## _claude_acheteurs
-- ################################################################
-- ============================================================
-- PROFILS ACHETEURS TYPÉS + NIVEAUX DE QUALIFICATION
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - buyer_type : repreneur individuel / entreprise / investisseur
--  - Critères de reprise : budget (target_budget, existant), apport,
--    secteurs (target_sectors, existant), localisation (target_geo,
--    existant), CA recherché, expérience, ambitions (texte libre).
--  - buyer_level : niveaux de crédibilité affichés en badges :
--      profil_cree       -> coordonnées vérifiées (défaut)
--      qualifie          -> projet et budget validés (par l'équipe)
--      finance_verifie   -> apport ou accord bancaire contrôlé
--    Seuls les admins peuvent faire évoluer ce niveau.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buyer_type text
  CHECK (buyer_type IS NULL OR buyer_type IN ('individuel', 'entreprise', 'investisseur'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buyer_level text NOT NULL DEFAULT 'profil_cree'
  CHECK (buyer_level IN ('profil_cree', 'qualifie', 'finance_verifie'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apport text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_revenue text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ambitions text;

-- Seul un admin peut modifier le niveau de qualification
CREATE OR REPLACE FUNCTION public.protect_buyer_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_level IS DISTINCT FROM OLD.buyer_level THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      NEW.buyer_level := OLD.buyer_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_buyer_level ON public.profiles;
CREATE TRIGGER trg_protect_buyer_level
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_buyer_level();

-- Badges publics (rassurer les vendeurs sur la crédibilité des repreneurs)
CREATE OR REPLACE VIEW public.buyer_badges AS
SELECT id, buyer_type, buyer_level, kyc_status
FROM public.profiles;

GRANT SELECT ON public.buyer_badges TO authenticated, anon;

-- ################################################################
-- ## _claude_freemium_search_ads
-- ################################################################
-- ============================================================
-- ANNONCES INVERSÉES (recherches de reprise) + QUOTA FREEMIUM
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - search_ads : un repreneur publie sa recherche (« entrepreneur
--    expérimenté recherche PME industrielle en AURA, CA 200-500k,
--    apport disponible »). Visible par tous, gérée par son auteur.
--  - conversation_initiations : contrainte d'unicité nécessaire au
--    quota freemium (3 nouveaux contacts / mois pour les comptes
--    gratuits, illimité en premium).
-- ============================================================

-- 1) Recherches de reprise
CREATE TABLE IF NOT EXISTS public.search_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  buyer_type text CHECK (buyer_type IS NULL OR buyer_type IN ('individuel', 'entreprise', 'investisseur')),
  sectors text,
  regions text,
  revenue_range text,
  budget text,
  apport_available boolean NOT NULL DEFAULT false,
  bank_financing boolean NOT NULL DEFAULT false,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_ads_owner ON public.search_ads(owner_id);
CREATE INDEX IF NOT EXISTS idx_search_ads_status ON public.search_ads(status);

ALTER TABLE public.search_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active search ads are public" ON public.search_ads;
CREATE POLICY "Active search ads are public"
  ON public.search_ads FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners manage their search ads" ON public.search_ads;
CREATE POLICY "Owners manage their search ads"
  ON public.search_ads FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2) Unicité des initiations de conversation (une par paire de membres)
DELETE FROM public.conversation_initiations a
USING public.conversation_initiations b
WHERE a.id > b.id
  AND a.initiator_id = b.initiator_id
  AND a.other_user_id = b.other_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_initiations_pair
  ON public.conversation_initiations(initiator_id, other_user_id);

ALTER TABLE public.conversation_initiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own initiations" ON public.conversation_initiations;
CREATE POLICY "Users manage their own initiations"
  ON public.conversation_initiations FOR ALL
  USING (initiator_id = auth.uid())
  WITH CHECK (initiator_id = auth.uid());

-- ################################################################
-- ## _claude_partenaires
-- ################################################################
-- ============================================================
-- ESPACE PARTENAIRE (banques, courtiers, avocats, experts-comptables)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - profiles.partner_type : banque / courtier / avocat / comptable
--  - dossiers : « Proposer un dossier » — 3 types :
--      annonce_client       (un cabinet dépose une entreprise pour un client)
--      projet_reprise       (un client cherche à acheter : budget, secteur…)
--      demande_financement  (envoyée aux banques APRÈS accord vendeur/repreneur)
--    Champs spécifiques dans `fields` (jsonb), documents en storage privé.
--    Le partenaire choisit qui peut consulter (visibility).
--  - appointments : petit agenda de rendez-vous des partenaires.
-- ============================================================

-- 1) Type de partenaire
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_type text
  CHECK (partner_type IS NULL OR partner_type IN ('banque', 'courtier', 'avocat', 'comptable'));

-- 2) Dossiers
CREATE TABLE IF NOT EXISTS public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('annonce_client', 'projet_reprise', 'demande_financement')),
  title text NOT NULL,
  client_name text,
  client_email text,
  description text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'accepte', 'refuse', 'cloture')),
  visibility text NOT NULL DEFAULT 'prive' CHECK (visibility IN ('prive', 'partenaires', 'membres')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossiers_partner ON public.dossiers(partner_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_visibility ON public.dossiers(visibility) WHERE visibility <> 'prive';

ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners manage their dossiers" ON public.dossiers;
CREATE POLICY "Partners manage their dossiers"
  ON public.dossiers FOR ALL
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- Visibilité contrôlée par le partenaire :
--  'partenaires' -> visible des autres partenaires (banques ne voient les
--                   demandes de financement qu'une fois acceptées)
--  'membres'     -> visible de tout membre connecté
DROP POLICY IF EXISTS "Shared dossiers are readable" ON public.dossiers;
CREATE POLICY "Shared dossiers are readable"
  ON public.dossiers FOR SELECT
  USING (
    partner_id = auth.uid()
    OR (
      visibility = 'membres'
      AND status <> 'brouillon'
      AND (type <> 'demande_financement' OR status IN ('accepte', 'cloture'))
    )
    OR (
      visibility = 'partenaires'
      AND status <> 'brouillon'
      AND (type <> 'demande_financement' OR status IN ('accepte', 'cloture'))
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_type IS NOT NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

CREATE OR REPLACE FUNCTION public.touch_dossier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_dossier ON public.dossiers;
CREATE TRIGGER trg_touch_dossier BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_dossier();

-- 3) Rendez-vous
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  with_name text,
  notes text,
  starts_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_organizer ON public.appointments(organizer_id, starts_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their appointments" ON public.appointments;
CREATE POLICY "Users manage their appointments"
  ON public.appointments FOR ALL
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- 4) Bucket privé pour les pièces des dossiers
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossiers', 'dossiers', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Partners upload dossier files" ON storage.objects;
CREATE POLICY "Partners upload dossier files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Partners read their dossier files" ON storage.objects;
CREATE POLICY "Partners read their dossier files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Partners delete their dossier files" ON storage.objects;
CREATE POLICY "Partners delete their dossier files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dossiers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ################################################################
-- ## _claude_place_projets
-- ################################################################
-- ============================================================
-- PLACE PROJETS : fiche de financement, vérification, accès complet
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - projects : champs de financement (apport personnel, utilisation
--    des fonds, CA actuel/prévisionnel, financements recherchés) +
--    statut de vérification (l'équipe vérifie avant mise en avant).
--  - project_access_requests : un membre/partenaire demande l'accès
--    complet ; le porteur accepte ou refuse (accès gratuit pour les
--    partenaires si accepté).
--  - project_private : business plan + prévisionnel du porteur,
--    visibles uniquement du porteur et des demandes acceptées.
-- ============================================================

-- 1) Fiche de financement
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS apport_personnel text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funds_usage text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revenue_current text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revenue_forecast text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS financing_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'non_soumis'
  CHECK (verification_status IN ('non_soumis', 'en_attente', 'verifie', 'rejete'));

-- Seul un admin peut accorder/refuser la vérification ;
-- le porteur peut seulement soumettre (en_attente).
CREATE OR REPLACE FUNCTION public.protect_project_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      IF NEW.verification_status <> 'en_attente' OR OLD.verification_status IN ('verifie') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_project_verification ON public.projects;
CREATE TRIGGER trg_protect_project_verification
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_verification();

-- 2) Demandes d'accès complet
CREATE TABLE IF NOT EXISTS public.project_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, requester_id)
);

ALTER TABLE public.project_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters manage their requests" ON public.project_access_requests;
CREATE POLICY "Requesters manage their requests"
  ON public.project_access_requests FOR ALL
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Owners see and answer requests" ON public.project_access_requests;
CREATE POLICY "Owners see and answer requests"
  ON public.project_access_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners update requests" ON public.project_access_requests;
CREATE POLICY "Owners update requests"
  ON public.project_access_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

-- 3) Dossier privé (business plan / prévisionnel)
CREATE TABLE IF NOT EXISTS public.project_private (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  business_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their private file" ON public.project_private;
CREATE POLICY "Owners manage their private file"
  ON public.project_private FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = project_id AND pr.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Accepted requesters read the private file" ON public.project_private;
CREATE POLICY "Accepted requesters read the private file"
  ON public.project_private FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_access_requests req
      WHERE req.project_id = project_private.project_id
        AND req.requester_id = auth.uid()
        AND req.status = 'accepted'
    )
  );
