-- Durcissement RLS global — corrige les policies USING(true) qui exposaient :
--   profiles         : phone, contact_email, stripe_customer_id/subscription_id
--                      de TOUS les utilisateurs à n'importe qui (fuite RGPD)
--   listing_views    : qui a consulté quelle annonce (viewer_id public)
--   profile_views    : qui a consulté quel profil (viewer_id public)
--   connections      : tout le graphe social, y compris les demandes en attente
--   project_interests: qui s'intéresse à quel projet
-- La surface publique des profils reste servie par la vue safe_profiles
-- (contact gated par show_email/show_phone), passée en security definer.

-- 1) PROFILES : lecture restreinte à son propre profil.
--    (Pas de policy admin auto-référente : récursion RLS. L'admin lit via
--    safe_profiles, security definer. Les policies d'autres tables qui testent
--    is_admin lisent la ligne de l'appelant lui-même -> couvertes.)
drop policy if exists "Profils publics" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Own profile read" on public.profiles;
create policy "Own profile read" on public.profiles
  for select using (auth.uid() = id);

-- 2) SAFE_PROFILES : passe en security definer (la table de base n'étant plus
--    lisible publiquement) + expose le compteur agrégé de vues de profil
--    (le nombre, jamais qui). Colonne ajoutée en fin de liste.
create or replace view public.safe_profiles
with (security_invoker = false) as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.show_email,
  p.show_phone,
  p.updated_at,
  p.is_admin,
  p.kyc_status,
  p.plan_type as plan,
  case
    when p.show_email = true or auth.uid() = p.id
      or exists (select 1 from public.profiles ap where ap.id = auth.uid() and ap.is_admin = true)
    then p.contact_email else null::text
  end as contact_email,
  case
    when p.show_phone = true or auth.uid() = p.id
      or exists (select 1 from public.profiles ap where ap.id = auth.uid() and ap.is_admin = true)
    then p.phone else null::text
  end as phone,
  p.plan_type,
  p.buyer_type,
  p.buyer_level,
  p.target_sectors,
  p.target_geo,
  p.target_budget,
  p.target_revenue,
  p.apport,
  p.experience,
  p.ambitions,
  (select count(*) from public.profile_views v where v.profile_id = p.id) as profile_views_count
from public.profiles p;

grant select on public.safe_profiles to anon, authenticated;

-- 3) LISTING_VIEWS : plus de lecture publique. Propriétaire (policy existante)
--    + admins (stats globales du dashboard admin).
drop policy if exists "Anyone can view listing views" on public.listing_views;
drop policy if exists "Enable read access for everyone on listing_views" on public.listing_views;
drop policy if exists "Admins read all listing views" on public.listing_views;
create policy "Admins read all listing views" on public.listing_views
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 4) PROFILE_VIEWS : plus de lecture publique (policy propriétaire existante).
--    Le compteur public passe par safe_profiles.profile_views_count.
drop policy if exists "Enable read access for everyone on profile_views" on public.profile_views;

-- 5) CONNECTIONS : les relations ACCEPTÉES restent publiques (preuve sociale,
--    onglet Relations des profils) ; les demandes en attente redeviennent
--    privées (policies participants existantes).
drop policy if exists "Users can view connections" on public.connections;
drop policy if exists "Accepted connections are public" on public.connections;
create policy "Accepted connections are public" on public.connections
  for select using (status = 'accepted');

-- 6) PROJECT_INTERESTS : lisible par l'intéressé lui-même et le porteur du
--    projet uniquement.
drop policy if exists "interests_public_read" on public.project_interests;
drop policy if exists "interests_self_read" on public.project_interests;
drop policy if exists "interests_owner_read" on public.project_interests;
create policy "interests_self_read" on public.project_interests
  for select using (user_id = auth.uid());
create policy "interests_owner_read" on public.project_interests
  for select using (
    exists (select 1 from public.projects pr
            where pr.id = project_interests.project_id and pr.owner_id = auth.uid())
  );
