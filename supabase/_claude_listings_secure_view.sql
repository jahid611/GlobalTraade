-- Vue masquante des annonces : impose CÔTÉ SERVEUR le bridage payant.
-- La table `listings` a une policy SELECT USING(true). Après verrouillage des
-- colonnes sensibles (revoke/grant plus bas), seule cette vue peut les lire
-- puis les nulle par ligne selon l'utilisateur appelant.
--
-- security definer : la vue lit la table de base avec les droits de son
-- propriétaire (les colonnes sensibles sont révoquées aux rôles anon/
-- authenticated) puis applique le masquage. auth.uid() reste l'appelant réel.
--
-- Accès :
--   financiers (revenue_n1/n2/n3, ebitda) : admin OU propriétaire OU
--     (payant/débloqué ET partage autorisé par le vendeur)
--   descriptifs confidentiels (description, reason_for_selling, lease_details) :
--     admin OU propriétaire OU payant OU annonce débloquée

create or replace view public.listings_secure
with (security_invoker = false) as
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
  (select count(*) from public.listing_views v where v.listing_id = l.id) as view_count,
  (select count(*) from public.favorites f where f.listing_id = l.id) as favorites_count
from public.listings l
cross join lateral (
  select
    (auth.uid() is not null and exists (
      select 1 from public.profiles pa where pa.id = auth.uid() and pa.is_admin = true
    )) as is_admin,
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
    (acc.is_admin or acc.is_owner or acc.is_paid or acc.is_unlocked) as full_ok,
    (acc.is_admin or acc.is_owner
       or ((acc.is_paid or acc.is_unlocked) and coalesce(l.share_financials, false))) as fin_ok
) g;

grant select on public.listings_secure to anon, authenticated;
