-- Tests d'escalade de privilège.
--
-- On se met dans la peau d'un membre lambda (rôle `authenticated`, JWT au nom
-- de MEMBRE) et on rejoue les tentatives qui fonctionnaient en production le
-- 22/09/2026. Chaque test consigne un verdict ; le script sort en erreur s'il
-- reste une case rouge.
--
-- Deux jeux d'assertions :
--   • les escalades doivent être bloquées ;
--   • les gestes légitimes doivent continuer à fonctionner (non-régression).

\set ON_ERROR_STOP on

CREATE TEMP TABLE resultat (nom text, attendu text, obtenu text, ok boolean);

CREATE OR REPLACE FUNCTION pg_temp.verdict(p_nom text, p_attendu text, p_obtenu text) RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO resultat VALUES (p_nom, p_attendu, p_obtenu, p_attendu IS NOT DISTINCT FROM p_obtenu);
$$;
GRANT ALL ON resultat TO authenticated, service_role;

-- Le détail de chaque étape n'intéresse personne : seul le bilan est affiché.
\o /dev/null

-- Deux comptes : un membre ordinaire, un administrateur
\set membre '11111111-1111-1111-1111-111111111111'
\set admin  '22222222-2222-2222-2222-222222222222'

DELETE FROM public.listing_unlocks;
DELETE FROM public.listings;
DELETE FROM public.projects;
DELETE FROM public.search_ads;
DELETE FROM public.profiles;

INSERT INTO public.profiles (id, full_name, plan_type, is_admin, kyc_status)
VALUES (:'membre', 'Membre Lambda', 'free', false, 'none'),
       (:'admin',  'Admin Globly',  'free', true,  'verified');

INSERT INTO public.listings (id, owner_id, name)
VALUES ('33333333-3333-3333-3333-333333333333', :'membre', 'Boulangerie du Marais');
INSERT INTO public.projects (id, owner_id, title)
VALUES ('44444444-4444-4444-4444-444444444444', :'membre', 'Projet du membre');

-- ═══════════════════════════════════════════════════════════════════════
--  Dans la peau du membre
-- ═══════════════════════════════════════════════════════════════════════
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

UPDATE public.profiles SET plan_type = 'business' WHERE id = :'membre';
SELECT pg_temp.verdict('Formule payante non auto-attribuable', 'free', plan_type) FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET is_admin = true WHERE id = :'membre';
SELECT pg_temp.verdict('Rôle admin non auto-attribuable', 'false', is_admin::text) FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET kyc_status = 'verified' WHERE id = :'membre';
SELECT pg_temp.verdict('Badge « vérifié » non auto-attribuable', 'none', kyc_status) FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET stripe_subscription_id = 'sub_faux' WHERE id = :'membre';
SELECT pg_temp.verdict('Abonnement Stripe non falsifiable', '', COALESCE(stripe_subscription_id, '')) FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET buyer_level = 'qualifie' WHERE id = :'membre';
SELECT pg_temp.verdict('Niveau de qualification réservé à l''admin', 'profil_cree', buyer_level) FROM public.profiles WHERE id = :'membre';

UPDATE public.listings SET boosted_until = now() + interval '30 days', is_premium = true
WHERE id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.verdict('Mise en avant non auto-attribuable', '', COALESCE(boosted_until::text, ''))
FROM public.listings WHERE id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.verdict('Badge premium non auto-attribuable', 'false', is_premium::text)
FROM public.listings WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE public.projects SET verification_status = 'verifie', boosted_until = now() + interval '30 days'
WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT pg_temp.verdict('Projet non auto-vérifiable', 'non_soumis', verification_status)
FROM public.projects WHERE id = '44444444-4444-4444-4444-444444444444';

-- Création d'annonce déjà mise en avant
INSERT INTO public.listings (id, owner_id, name, is_premium, boosted_until)
VALUES ('55555555-5555-5555-5555-555555555555', :'membre', 'Annonce trichée', true, now() + interval '30 days');
SELECT pg_temp.verdict('Mise en avant impossible dès la création', 'false|',
       is_premium::text || '|' || COALESCE(boosted_until::text, ''))
FROM public.listings WHERE id = '55555555-5555-5555-5555-555555555555';

-- Création de profil : l'onboarding doit continuer de fonctionner, et les
-- privilèges demandés par le client doivent être ignorés.
-- (Régression du 22/09/2026 : forcer buyer_level à NULL cassait tout INSERT.)
SET request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
INSERT INTO public.profiles (id, full_name, is_admin, plan_type, kyc_status, buyer_level)
VALUES ('66666666-6666-6666-6666-666666666666', 'Nouveau Membre', true, 'business', 'verified', 'finance_verifie');
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT pg_temp.verdict('Création de profil possible (onboarding)', 'Nouveau Membre', full_name)
FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666';
SELECT pg_temp.verdict('Création de profil : privilèges hostiles ignorés', 'false|free|none|profil_cree',
       is_admin::text || '|' || plan_type || '|' || kyc_status || '|' || buyer_level)
FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666';

-- Déblocage payant que l'on s'offre soi-même
DO $$
BEGIN
  INSERT INTO public.listing_unlocks (user_id, target_type, target_id, amount_cents)
  VALUES ('11111111-1111-1111-1111-111111111111', 'listing', '33333333-3333-3333-3333-333333333333', 0);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  NULL; -- comportement attendu après correctif
END $$;
SELECT pg_temp.verdict('Déblocage payant non auto-attribuable', '0', count(*)::text)
FROM public.listing_unlocks WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ─── Non-régression : ce que le membre DOIT pouvoir faire ──────────────
UPDATE public.profiles SET full_name = 'Jean-Marc Vasseur', phone = '+33600000000', email_alerts = false
WHERE id = :'membre';
SELECT pg_temp.verdict('Modification de son profil toujours possible', 'Jean-Marc Vasseur', full_name)
FROM public.profiles WHERE id = :'membre';
SELECT pg_temp.verdict('Réglage des alertes email toujours possible', 'false', email_alerts::text)
FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET kyc_status = 'pending' WHERE id = :'membre';
SELECT pg_temp.verdict('Demande de vérification d''identité possible', 'pending', kyc_status)
FROM public.profiles WHERE id = :'membre';

UPDATE public.projects SET verification_status = 'en_attente' WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT pg_temp.verdict('Demande de vérification de projet possible', 'en_attente', verification_status)
FROM public.projects WHERE id = '44444444-4444-4444-4444-444444444444';

UPDATE public.listings SET name = 'Boulangerie du Marais — 75004' WHERE id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.verdict('Modification de son annonce toujours possible', 'Boulangerie du Marais — 75004', name)
FROM public.listings WHERE id = '33333333-3333-3333-3333-333333333333';

-- ═══════════════════════════════════════════════════════════════════════
--  Dans la peau de l'administrateur
-- ═══════════════════════════════════════════════════════════════════════
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

UPDATE public.profiles SET kyc_status = 'verified' WHERE id = :'membre';
SELECT pg_temp.verdict('Un admin valide bien un KYC', 'verified', kyc_status) FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET buyer_level = 'qualifie' WHERE id = :'membre';
SELECT pg_temp.verdict('Un admin fixe bien le niveau de qualification', 'qualifie', buyer_level)
FROM public.profiles WHERE id = :'membre';

UPDATE public.profiles SET plan_type = 'business' WHERE id = :'membre';
SELECT pg_temp.verdict('Même un admin ne change pas une formule payante', 'free', plan_type)
FROM public.profiles WHERE id = :'membre';

-- ═══════════════════════════════════════════════════════════════════════
--  Dans la peau du webhook Stripe (service_role)
-- ═══════════════════════════════════════════════════════════════════════
RESET ROLE;
SET request.jwt.claims = '{"role":"service_role"}';

UPDATE public.profiles SET plan_type = 'business', stripe_subscription_id = 'sub_reel' WHERE id = :'membre';
SELECT pg_temp.verdict('Le webhook Stripe accorde bien la formule', 'business', plan_type) FROM public.profiles WHERE id = :'membre';

DELETE FROM public.listing_unlocks;
INSERT INTO public.listing_unlocks (user_id, target_type, target_id)
VALUES (:'membre', 'listing', '33333333-3333-3333-3333-333333333333');
SELECT pg_temp.verdict('Le webhook Stripe crée bien un déblocage', '1', count(*)::text)
FROM public.listing_unlocks WHERE user_id = :'membre';

UPDATE public.listings SET boosted_until = now() + interval '30 days' WHERE id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.verdict('Le webhook Stripe applique bien la mise en avant', 'true',
       (boosted_until IS NOT NULL)::text) FROM public.listings WHERE id = '33333333-3333-3333-3333-333333333333';

-- ═══════════════════════════════════════════════════════════════════════
\o
\echo ''
\echo '───────────────────────────────────────────────────────────────'
SELECT CASE WHEN ok THEN '  OK  ' ELSE ' ÉCHEC' END AS statut,
       nom,
       CASE WHEN ok THEN '' ELSE 'attendu « ' || attendu ||' », obtenu « ' || obtenu || ' »' END AS detail
FROM resultat ORDER BY ok, nom;
\echo '───────────────────────────────────────────────────────────────'

SELECT count(*) FILTER (WHERE ok) || '/' || count(*) || ' contrôles au vert' AS bilan FROM resultat;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM resultat WHERE NOT ok;
  IF n > 0 THEN RAISE EXCEPTION '% contrôle(s) en échec', n; END IF;
END $$;
