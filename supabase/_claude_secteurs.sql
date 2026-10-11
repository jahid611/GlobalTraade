-- =====================================================================
-- SECTEURS D'ACTIVITÉ — une seule liste pour tout le site
-- =====================================================================
-- Les projets avaient leur propre liste de 23 « catégories », stockées en
-- français, différente de la liste des secteurs utilisée partout ailleurs.
-- Elles rejoignent la liste maîtresse (src/lib/industries.ts) : ce patch
-- renomme les valeurs déjà en base vers leur clé dans cette liste, pour que
-- les filtres par secteur les retrouvent.
--
-- L'application sait aussi relire les anciennes valeurs (canonicalIndustry),
-- donc rien ne casse si une ligne échappe à ce patch.
--
-- Idempotent.
-- =====================================================================

BEGIN;

UPDATE public.projects p
SET category = m.new_value
FROM (VALUES
  ('Tech & IA', 'Tech / AI'),
  ('Santé', 'Healthcare'),
  ('Éducation', 'Education'),
  ('Industrie', 'Industry / Manufacturing'),
  ('Commerce', 'Retail'),
  ('Restauration', 'Restaurant'),
  ('Artisanat', 'Craftsmanship'),
  ('Mode & Textile', 'Fashion / Textile'),
  ('Beauté & Bien-être', 'Beauty / Wellness'),
  ('Sport & Loisirs', 'Sport / Leisure'),
  ('Tourisme & Hôtellerie', 'Tourism / Hospitality'),
  ('Culture & Art', 'Culture / Art'),
  ('Médias & Communication', 'Media / Communication'),
  ('BTP & Construction', 'Construction / Civil Engineering'),
  ('Immobilier', 'Real Estate'),
  ('Énergie', 'Energy'),
  ('Environnement', 'Environment'),
  ('Automobile', 'Automotive'),
  ('Autre', 'Other')
) AS m(old_value, new_value)
WHERE p.category = m.old_value;

-- Une annonce portait un secteur saisi en français, absent de la liste.
UPDATE public.listings
SET industry = 'Automotive Sales / Maintenance'
WHERE industry = 'Achat / Vente automobile';

COMMIT;
