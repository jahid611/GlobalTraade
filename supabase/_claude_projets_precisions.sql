-- =====================================================================
-- PROJETS — des besoins précis
-- =====================================================================
-- Chaque aide demandée par un porteur de projet se précise désormais :
--   - équipe et matériel : les précisions (rémunération, lieu, date, mode
--     d'apport, état) vivent dans les éléments JSON déjà existants
--     (team_roles, material_items) — rien à changer en base pour elles ;
--   - expertise et réseau n'avaient aucun endroit où préciser quoi que ce
--     soit : deux colonnes JSON leur sont ajoutées.
--
-- Comme le reste du dossier, ces précisions ne sont renvoyées par la vue
-- `projects_secure` qu'au porteur, à l'admin, aux formules payantes et aux
-- déblocages.
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expertise_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS network_details   jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Garde-fous : un objet, et de taille raisonnable.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_expertise_details_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_expertise_details_check
  CHECK (jsonb_typeof(expertise_details) = 'object' AND pg_column_size(expertise_details) <= 4096);
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_network_details_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_network_details_check
  CHECK (jsonb_typeof(network_details) = 'object' AND pg_column_size(network_details) <= 4096);

-- La vue masquante : même définition qu'avant, avec les deux nouvelles
-- colonnes ajoutées À LA FIN (seule position autorisée pour un remplacement).
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
  o.kyc_status AS owner_kyc_status,
  -- Précisions des aides « expertise » et « réseau » : elles font partie du dossier
  CASE WHEN g.full_ok THEN p.expertise_details END AS expertise_details,
  CASE WHEN g.full_ok THEN p.network_details   END AS network_details
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

NOTIFY pgrst, 'reload schema';

COMMIT;
