-- Vue masquante des annonces : impose CÔTÉ SERVEUR le bridage payant.
-- La table `listings` a une policy SELECT USING(true) qui renvoie TOUTES les
-- colonnes (CA, EBITDA, descriptif confidentiel) à n'importe qui. Le front ne
-- faisait que les masquer visuellement -> fuite lisible dans l'onglet réseau.
-- Cette vue nulle les colonnes sensibles par ligne selon l'utilisateur appelant.
--
-- Accès :
--   financiers (revenue_n1/n2/n3, ebitda) : propriétaire OU (payant/débloqué ET
--     partage autorisé par le vendeur)
--   descriptifs confidentiels (description, reason_for_selling, lease_details) :
--     propriétaire OU payant OU annonce débloquée
-- Les écritures restent sur la table de base (policies INSERT/UPDATE inchangées).

create or replace view public.listings_secure
with (security_invoker = true) as
select
  l.id, l.name, l.siret, l.industry, l.address, l.lat, l.lng, l.location,
  l.price, l.rent, l.employees, l.surface,
  l.created_at, l.owner_id, l.logo_url, l.website_url, l.hide_siret, l.image_urls,
  l.established_year, l.requires_nda, l.management_type, l.client_concentration,
  l.digital_maturity, l.market_trend, l.is_premium, l.updated_at, l.status,
  l.last_confirmed_at, l.renewal_requested_at, l.inactive_since,
  l.renewal_reminder_sent_at, l.boosted_until, l.share_financials,
  case when g.fin_ok  then l.revenue_n1 end as revenue_n1,
  case when g.fin_ok  then l.revenue_n2 end as revenue_n2,
  case when g.fin_ok  then l.revenue_n3 end as revenue_n3,
  case when g.fin_ok  then l.ebitda     end as ebitda,
  case when g.full_ok then l.description        end as description,
  case when g.full_ok then l.reason_for_selling end as reason_for_selling,
  case when g.full_ok then l.lease_details      end as lease_details,
  (select count(*) from public.listing_views v where v.listing_id = l.id) as view_count
from public.listings l
cross join lateral (
  select
    (l.owner_id = auth.uid()) as is_owner,
    (coalesce((select p.plan_type from public.profiles p where p.id = auth.uid()), 'free')
       in ('pro', 'business', 'premium')) as is_paid,
    exists (
      select 1 from public.listing_unlocks u
      where u.user_id = auth.uid() and u.target_type = 'listing' and u.target_id = l.id
    ) as is_unlocked
) acc
cross join lateral (
  select
    (acc.is_owner or acc.is_paid or acc.is_unlocked) as full_ok,
    (acc.is_owner or ((acc.is_paid or acc.is_unlocked) and coalesce(l.share_financials, false))) as fin_ok
) g;

grant select on public.listings_secure to anon, authenticated;
