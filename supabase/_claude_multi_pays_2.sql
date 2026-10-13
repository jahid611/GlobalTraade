-- CHANTIER MULTI-PAYS, étape 2 : la langue du membre dans son profil.
--
-- La langue choisie sur le site n'était gardée que dans le navigateur. Les
-- courriels envoyés par le serveur (nouvelles annonces, message reçu, rappel de
-- renouvellement, décision de l'équipe) ne la connaissaient pas et partaient
-- tous en français.
--
-- Ce fichier ajoute profiles.language (« fr », « en », « es », « it », « pt »,
-- « de »), vide par défaut : un profil sans langue reçoit ses courriels en
-- français, comme avant. Le site la remplit quand le membre choisit sa langue.
-- Rien n'est supprimé ni renommé. Peut être rejoué sans risque.

begin;

alter table public.profiles add column if not exists language text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_language_known') then
    alter table public.profiles add constraint profiles_language_known
      check (language is null or language in ('fr', 'en', 'es', 'it', 'pt', 'de'));
  end if;
end $$;

commit;
