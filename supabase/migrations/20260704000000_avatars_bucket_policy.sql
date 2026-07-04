-- ════════════════════════════════════════════════════════════════════
-- RideDrop — avatars storage bucket + owner-scoped write policies
-- ────────────────────────────────────────────────────────────────────
-- Avatars are profile pictures meant to be seen by other users, so the
-- bucket is PUBLIC for reads. Safety comes from the upload path
-- (src/lib/actions/upload-avatar.ts), which magic-byte-validates the file
-- and accepts only JPEG/PNG/WebP — never SVG/HTML — so a public URL can't
-- serve a stored-XSS payload.
--
-- Writes are locked to the owner: object names are `<userId>/<ts>.<ext>`,
-- and the policies below require the first path segment to equal auth.uid().
-- ════════════════════════════════════════════════════════════════════

begin;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Owner-only INSERT
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only UPDATE (upsert overwrites)
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only DELETE
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public READ (profile pictures). Public bucket already serves reads via the
-- public endpoint; this explicit policy keeps intent clear.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

commit;
