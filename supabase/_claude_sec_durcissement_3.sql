-- Durcissement de sécurité n° 3 — audit du 12/10/2026.
-- Politiques, vues, déclencheurs et buckets relus dans la base de production
-- avant écriture (noms exacts, aucun fichier ni NDA existant hors des règles).
-- Rejouable : chaque instruction supporte d'être exécutée deux fois.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Vues publiques : lecture seule.
--    Elles appartiennent à postgres (qui contourne la RLS) et étaient
--    modifiables : un visiteur anonyme pouvait réécrire ou supprimer des
--    profils en écrivant à travers safe_profiles / buyer_badges.
-- ─────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.safe_profiles, public.buyer_badges, public.listings_secure,
              public.projects_secure, public.search_ads_secure, public.user_ratings_summary
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.safe_profiles, public.buyer_badges, public.listings_secure,
                public.projects_secure, public.search_ads_secure, public.user_ratings_summary
  TO anon, authenticated;

-- L'identifiant d'un profil ne change jamais (sinon une ligne payante ou admin
-- pouvait être « déplacée » vers un autre compte).
CREATE OR REPLACE FUNCTION public.protect_profile_id() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'L''identifiant d''un profil ne peut pas être modifié.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_profile_id() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_profile_id ON public.profiles;
CREATE TRIGGER trg_protect_profile_id BEFORE UPDATE OF id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_id();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Messagerie : le compteur de conversations n'est plus inscriptible par le
--    client (une ligne insérée à la main faisait sauter le paywall). C'est le
--    déclencheur enforce_contact_quota qui le tient.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Initiations : enregistrement" ON public.conversation_initiations;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.conversation_initiations FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Prospection : plus de modification des contacts déjà comptés (changer le
--    mois remettait le forfait à zéro).
--    Reste à faire, avec le front : remplacer l'insertion directe par une
--    fonction qui impose le mois courant et le plafond de 20.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Prospection : mise à jour de ses contacts non facturés" ON public.prospection_contacts;
REVOKE UPDATE, DELETE, TRUNCATE ON public.prospection_contacts FROM anon, authenticated;

-- Suivi des envois, tenu par la fonction send-prospect-email (clé de service).
ALTER TABLE public.prospection_contacts
  ADD COLUMN IF NOT EXISTS sent_to text,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Engagements de confidentialité (NDA).
--    La base impose maintenant ce que seul l'écran vérifiait : pour signer, il
--    faut une formule payante ou avoir débloqué l'annonce. Le vendeur ne signe
--    pas son propre NDA, l'annonce doit être en ligne, la date de signature
--    vient du serveur et les colonnes d'identité sont figées.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_nda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_status text;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  SELECT owner_id, status INTO v_owner, v_status FROM listings WHERE id = NEW.listing_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.buyer_id = v_owner THEN
      RAISE EXCEPTION 'Le vendeur ne signe pas l''engagement de sa propre annonce.' USING ERRCODE = '42501';
    END IF;
    IF v_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Cette annonce n''est pas en ligne.' USING ERRCODE = '42501';
    END IF;
    IF NOT (public.current_user_is_paid()
            OR public.current_user_has_unlock('listing', NEW.listing_id)
            OR public.current_user_is_admin()) THEN
      RAISE EXCEPTION 'Débloquez cette annonce pour accéder à sa data room.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('pending', 'signed') THEN NEW.status := 'pending'; END IF;
    NEW.signed_at := CASE WHEN NEW.status = 'signed' THEN now() END;
    NEW.created_at := now();
  ELSE
    NEW.listing_id := OLD.listing_id;
    NEW.buyer_id := OLD.buyer_id;
    NEW.created_at := OLD.created_at;
    NEW.signature_text := OLD.signature_text;
    NEW.signed_at := CASE WHEN NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed'
                          THEN now() ELSE OLD.signed_at END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_nda() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_nda ON public.ndas;
CREATE TRIGGER trg_guard_nda BEFORE INSERT OR UPDATE ON public.ndas
  FOR EACH ROW EXECUTE FUNCTION public.guard_nda();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Data room : un document appartient au dossier de son annonce, et le
--    stockage vérifie ce lien (sinon on pouvait « rattacher » le fichier d'une
--    autre annonce à la sienne et le lire).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.vdr_documents DROP CONSTRAINT IF EXISTS vdr_path_in_listing;
ALTER TABLE public.vdr_documents ADD CONSTRAINT vdr_path_in_listing
  CHECK (file_path LIKE listing_id::text || '/%' AND file_path NOT LIKE '%..%');

DROP POLICY IF EXISTS "Buyers can read VDR bucket if NDA signed" ON storage.objects;
DROP POLICY IF EXISTS "VDR : lecture acheteur NDA signé" ON storage.objects;
CREATE POLICY "VDR : lecture acheteur NDA signé" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vdr' AND EXISTS (
  SELECT 1 FROM public.vdr_documents d
  JOIN public.ndas n ON n.listing_id = d.listing_id
  JOIN public.listings l ON l.id = d.listing_id
  WHERE d.file_path = objects.name
    AND (storage.foldername(objects.name))[1] = d.listing_id::text
    AND n.buyer_id = auth.uid() AND n.status = 'signed' AND l.owner_id <> auth.uid()));

-- Le vendeur ne dépose que dans le dossier de sa propre annonce.
DROP POLICY IF EXISTS "Owners manage VDR bucket" ON storage.objects;
DROP POLICY IF EXISTS "VDR : vendeur, dossier de son annonce" ON storage.objects;
CREATE POLICY "VDR : vendeur, dossier de son annonce" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'vdr' AND EXISTS (SELECT 1 FROM public.listings l
        WHERE l.id::text = (storage.foldername(name))[1] AND l.owner_id = auth.uid()))
WITH CHECK (bucket_id = 'vdr' AND EXISTS (SELECT 1 FROM public.listings l
        WHERE l.id::text = (storage.foldername(name))[1] AND l.owner_id = auth.uid()));

-- Journal d'accès : réservé aux signataires, horodaté par le serveur.
DROP POLICY IF EXISTS "Journal data room : en son nom" ON public.vdr_access_logs;
DROP POLICY IF EXISTS "Journal : signataire uniquement" ON public.vdr_access_logs;
CREATE POLICY "Journal : signataire uniquement" ON public.vdr_access_logs FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.vdr_documents d JOIN public.ndas n ON n.listing_id = d.listing_id
  WHERE d.id = document_id AND n.buyer_id = auth.uid() AND n.status = 'signed'));
CREATE OR REPLACE FUNCTION public.vdr_log_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.viewed_at := now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.vdr_log_stamp() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_vdr_log_stamp ON public.vdr_access_logs;
CREATE TRIGGER trg_vdr_log_stamp BEFORE INSERT ON public.vdr_access_logs
  FOR EACH ROW EXECUTE FUNCTION public.vdr_log_stamp();

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Pièces d'identité (KYC) : un fichier ne quitte pas le dossier de son
--    propriétaire (on pouvait le déplacer dans le dossier d'un autre membre).
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "KYC : remplacement dans son dossier" ON storage.objects;
CREATE POLICY "KYC : remplacement dans son dossier" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid()
       AND (storage.foldername(name))[1] = 'kyc' AND (storage.foldername(name))[2] = auth.uid()::text)
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid()
       AND (storage.foldername(name))[1] = 'kyc' AND (storage.foldername(name))[2] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Stockage : taille et types de fichiers bornés côté serveur.
-- ─────────────────────────────────────────────────────────────────────────
-- Images : pas de SVG ni de HTML (ils peuvent contenir du script).
UPDATE storage.buckets SET file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
  WHERE id IN ('avatars', 'listings');
UPDATE storage.buckets SET file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
  WHERE id = 'documents';
UPDATE storage.buckets SET file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/csv','text/plain',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']
  WHERE id = 'vdr';

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Avis : l'auteur ne peut pas écrire lui-même la « réponse » du membre noté.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_rating_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  NEW.reply := NULL;
  NEW.replied_at := NULL;
  NEW.created_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_rating_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_rating_insert ON public.ratings;
CREATE TRIGGER trg_protect_rating_insert BEFORE INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.protect_rating_insert();

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Politiques admin : passer par current_user_is_admin(), qui exige la
--    double authentification quand elle est activée.
-- ─────────────────────────────────────────────────────────────────────────
ALTER POLICY "Admins can update any profile" ON public.profiles
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
ALTER POLICY "Admins can delete ratings"   ON public.ratings USING (public.current_user_is_admin());
ALTER POLICY "Admins can moderate ratings" ON public.ratings USING (public.current_user_is_admin());
ALTER POLICY "Admins manage reports" ON public.reports USING (public.current_user_is_admin());
ALTER POLICY "Reporters and admins can read reports" ON public.reports
  USING (auth.uid() = reporter_id OR public.current_user_is_admin());
ALTER POLICY "Admins read all listing views" ON public.listing_views USING (public.current_user_is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 10. Formulaire de contact et signalements : limites anti-spam.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.limit_contact_messages() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM contact_messages
        WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '1 day') >= 3
     OR (SELECT count(*) FROM contact_messages WHERE created_at > now() - interval '10 minutes') >= 20 THEN
    RAISE EXCEPTION 'Trop de messages, réessayez plus tard.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_contact_messages() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_limit_contact ON public.contact_messages;
CREATE TRIGGER trg_limit_contact BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.limit_contact_messages();

-- ─────────────────────────────────────────────────────────────────────────
-- 11. Hygiène des droits.
-- ─────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.handle_project_view() SET search_path = public;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

COMMIT;
