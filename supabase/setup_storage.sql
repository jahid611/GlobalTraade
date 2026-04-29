-- 1. Créer le bucket (dossier) 'listings'
insert into storage.buckets (id, name, public) 
values ('listings', 'listings', true)
on conflict (id) do nothing;

-- 2. Permettre à tout le monde de lire les images
create policy "Images publiques" 
on storage.objects for select 
using ( bucket_id = 'listings' );

-- 3. Permettre aux utilisateurs connectés d'uploader des images
create policy "Upload par utilisateur" 
on storage.objects for insert 
with check ( bucket_id = 'listings' and auth.role() = 'authenticated' );

-- 4. Permettre aux utilisateurs de supprimer/modifier leurs propres images
create policy "Modification par propriétaire" 
on storage.objects for update
using ( bucket_id = 'listings' and auth.role() = 'authenticated' );

create policy "Suppression par propriétaire" 
on storage.objects for delete 
using ( bucket_id = 'listings' and auth.role() = 'authenticated' );