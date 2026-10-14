-- Projet de reprise : trois critères de plus pour la correspondance annonce / repreneur.
-- Ajout seulement (aucune donnée modifiée ni supprimée) ; les colonnes sont vides
-- pour les comptes existants. Peut être rejoué sans risque.
--
--   target_excluded_sectors : secteurs que le repreneur ne veut pas, clés de la
--                             liste maîtresse séparées par des virgules (« Bar,Tobacco »)
--   target_team_size        : taille d'équipe voulue (voir src/lib/buyerProject.ts)
--   buyer_role              : son rôle après la reprise
alter table public.profiles add column if not exists target_excluded_sectors text;
alter table public.profiles add column if not exists target_team_size text;
alter table public.profiles add column if not exists buyer_role text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_target_team_size_check') then
    alter table public.profiles add constraint profiles_target_team_size_check
      check (target_team_size is null or target_team_size in ('solo', '1-5', '6-20', '21-50', '50+'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_buyer_role_check') then
    alter table public.profiles add constraint profiles_buyer_role_check
      check (buyer_role is null or buyer_role in ('exploitant', 'dirigeant', 'investisseur'));
  end if;
end $$;

comment on column public.profiles.target_excluded_sectors is 'Secteurs exclus par le repreneur (clés de la liste maîtresse, séparées par des virgules)';
comment on column public.profiles.target_team_size is 'Taille d''équipe recherchée : solo, 1-5, 6-20, 21-50, 50+';
comment on column public.profiles.buyer_role is 'Rôle après la reprise : exploitant, dirigeant, investisseur';
