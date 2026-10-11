-- =====================================================================
-- PAYS — une seule liste, une seule valeur
-- =====================================================================
-- Le pays était stocké sous son nom français : 16 choix à l'inscription,
-- saisie libre sur un projet. Tous les champs « Pays » du site proposent
-- désormais tous les pays du monde et enregistrent le code ISO à deux lettres
-- (« FR »), qui ne dépend ni de la langue ni du navigateur
-- (src/lib/countries.ts). Ce patch convertit les valeurs déjà en base.
--
-- L'application sait aussi relire les anciens noms (canonicalCountry), donc
-- une valeur non convertie reste affichée correctement.
--
-- Idempotent.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE _pays (old_name text PRIMARY KEY, code text NOT NULL) ON COMMIT DROP;
INSERT INTO _pays VALUES
  ('france', 'FR'), ('belgique', 'BE'), ('suisse', 'CH'), ('luxembourg', 'LU'), ('monaco', 'MC'),
  ('allemagne', 'DE'), ('espagne', 'ES'), ('italie', 'IT'), ('portugal', 'PT'), ('pays-bas', 'NL'),
  ('royaume-uni', 'GB'), ('irlande', 'IE'), ('canada', 'CA'), ('maroc', 'MA'), ('tunisie', 'TN'),
  ('algérie', 'DZ'), ('algerie', 'DZ'), ('états-unis', 'US'), ('etats-unis', 'US'), ('sénégal', 'SN'), ('senegal', 'SN');

UPDATE public.profiles p SET country = m.code
FROM _pays m WHERE lower(btrim(p.country)) = m.old_name;

UPDATE public.projects p SET country = m.code
FROM _pays m WHERE lower(btrim(p.country)) = m.old_name;

-- Un nouveau profil est en France par défaut : même valeur que le formulaire.
ALTER TABLE public.profiles ALTER COLUMN country SET DEFAULT 'FR';

COMMIT;
