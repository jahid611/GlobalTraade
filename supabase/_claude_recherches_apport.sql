-- =====================================================================
-- RECHERCHES DE REPRENEURS — le montant de l'apport
-- =====================================================================
-- Une recherche disait seulement « apport disponible » (oui / non). Un vendeur
-- ne peut rien en faire : 5 000 € ou 300 000 €, ce n'est pas le même repreneur.
-- Le montant est désormais demandé et affiché.
--
-- Idempotent, une seule transaction.
-- =====================================================================

BEGIN;

ALTER TABLE public.search_ads ADD COLUMN IF NOT EXISTS apport_amount numeric;
ALTER TABLE public.search_ads DROP CONSTRAINT IF EXISTS search_ads_apport_amount_check;
ALTER TABLE public.search_ads ADD CONSTRAINT search_ads_apport_amount_check
  CHECK (apport_amount IS NULL OR (apport_amount >= 0 AND apport_amount <= 1000000000));

-- La vue masquante : même définition qu'avant, le montant ajouté À LA FIN.
-- Il fait partie de l'en-tête public de la recherche, comme le budget.
CREATE OR REPLACE VIEW public.search_ads_secure
WITH (security_invoker = false) AS
SELECT
  s.id, s.owner_id, s.title, s.buyer_type, s.sectors, s.regions, s.revenue_range, s.budget,
  s.apport_available, s.bank_financing, s.status, s.created_at, s.updated_at, s.boosted_until,
  CASE WHEN g.full_ok THEN s.description END AS description,
  (s.description IS NOT NULL AND s.description <> '') AS has_description,
  g.full_ok AS has_full_access,
  s.apport_amount
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

NOTIFY pgrst, 'reload schema';

COMMIT;
