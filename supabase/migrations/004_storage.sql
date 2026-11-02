-- =====================================================================
-- JASTAR HUB · миграция 004: хранилище файлов
--   avatars — фото профилей (публичные), files — доказательства, фото и документы (только для вошедших)
--   Пользователь загружает файлы только в свою папку <user_id>/...
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152), ('files', 'files', false, 41943040)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_own_write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "avatars_own_update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "files_signed_in_read" on storage.objects for select to authenticated using (bucket_id = 'files');
create policy "files_own_write" on storage.objects for insert to authenticated with check (bucket_id = 'files' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "files_own_delete" on storage.objects for delete to authenticated using (bucket_id in ('files', 'avatars') and (storage.foldername(name))[1] = (auth.uid())::text);
