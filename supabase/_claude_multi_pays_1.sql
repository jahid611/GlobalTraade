-- CHANTIER MULTI-PAYS, étape 1 : un pays sur chaque annonce.
--
-- Jusqu'ici le pays d'une annonce n'existait que dans le texte de son adresse
-- (« …, Espagne »). On ne pouvait ni filtrer par pays, ni adapter le formulaire,
-- la fiche ou les documents au pays de l'entreprise.
--
-- Ce fichier :
--   1. ajoute à listings : country (code ISO à 2 lettres, « FR » par défaut),
--      region, city, postal_code (remplis par le formulaire à partir de l'adresse) ;
--   2. renseigne le pays des annonces existantes d'après la fin de leur adresse ;
--   3. rend ces 4 colonnes lisibles (elles ne sont pas sensibles) ;
--   4. les ajoute à la vue listings_secure, sans toucher au masquage des chiffres.
--
-- Rien n'est supprimé ni renommé. Peut être rejoué sans risque.

begin;

alter table public.listings
  add column if not exists country text not null default 'FR',
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists postal_code text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_country_iso2') then
    alter table public.listings add constraint listings_country_iso2 check (country ~ '^[A-Z]{2}$');
  end if;
end $$;

-- Annonces existantes : le pays écrit à la fin de l'adresse. Tout le reste est en France.
update public.listings l
   set country = m.code
  from (values
    ('ES', '(espagne|españa|spain)'),
    ('PT', '(portugal)'),
    ('DE', '(allemagne|deutschland|germany)'),
    ('IT', '(italie|italia|italy)'),
    ('GB', '(royaume-uni|united kingdom|angleterre|england)'),
    ('BE', '(belgique|belgium|belgië)'),
    ('CH', '(suisse|schweiz|switzerland)'),
    ('BR', '(brésil|brasil|brazil)'),
    ('KR', '(corée du sud|south korea)')
  ) as m(code, pattern)
 where l.country = 'FR'
   and l.address ~* (',\s*' || m.pattern || '\s*$');

create index if not exists listings_country_idx on public.listings (country);

-- Colonnes non sensibles : lisibles comme l'adresse.
grant select (country, region, city, postal_code) on public.listings to anon, authenticated;

-- La vue masquante expose les 4 colonnes, ajoutées en fin de liste. Sa définition
-- actuelle est reprise telle quelle : le masquage des chiffres n'est pas réécrit.
do $$
declare
  def text;
  patched text;
begin
  def := pg_get_viewdef('public.listings_secure'::regclass, true);
  if position('l.country' in def) > 0 then
    return; -- déjà fait
  end if;
  patched := replace(def, E'\n   FROM listings l\n', E',\n    l.country,\n    l.region,\n    l.city,\n    l.postal_code\n   FROM listings l\n');
  if patched = def then
    raise exception 'listings_secure : définition inattendue, la vue n''a pas été modifiée';
  end if;
  execute 'create or replace view public.listings_secure with (security_invoker = false) as ' || patched;
end $$;

grant select on public.listings_secure to anon, authenticated;

commit;
