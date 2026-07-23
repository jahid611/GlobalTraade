-- Verrouillage des colonnes sensibles de la table listings au niveau des droits.
-- Un GRANT SELECT au niveau table couvre toutes les colonnes : un simple REVOKE
-- de colonne ne suffit pas. On révoque donc le SELECT table entière puis on
-- re-grante uniquement les colonnes NON sensibles à anon/authenticated.
-- Les 7 colonnes sensibles (revenue_n1/n2/n3, ebitda, description,
-- reason_for_selling, lease_details) ne sont plus lisibles directement : seul
-- passe la vue listings_secure (security definer, propriété postgres) qui les
-- masque par ligne selon l'utilisateur. service_role et postgres conservent tout.

revoke select on public.listings from anon, authenticated;

grant select (
  id, name, siret, industry, address, lat, lng, location,
  price, rent, employees, surface,
  created_at, owner_id, logo_url, website_url, hide_siret, image_urls,
  established_year, requires_nda, management_type, client_concentration,
  digital_maturity, market_trend, is_premium, updated_at, status,
  last_confirmed_at, renewal_requested_at, inactive_since,
  renewal_reminder_sent_at, boosted_until, share_financials
) on public.listings to anon, authenticated;
