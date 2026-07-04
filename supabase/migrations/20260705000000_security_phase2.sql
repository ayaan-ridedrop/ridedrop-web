-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Security Phase 2
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ ALREADY APPLIED MANUALLY to production via the SQL editor on
-- 2026-07-05 (late-night security session). This file exists so the repo
-- matches the live database. Running it again is harmless except the
-- profiles grant lines, which are idempotent anyway.
--
-- Context: most of 20260613000000_security_phase1.sql had been applied
-- manually (bookings UPDATE revoked, messages policy fixed, handover
-- photos scoped, carrier_profiles read restricted to self). This closes
-- what was still open:
--   1. jobs table had RLS switched OFF (a debugging snippet disabled it;
--      the policies themselves still existed).
--   2. Any authenticated user could read every profile's phone number.
--      Phase 1's column-level REVOKE was ineffective because the roles
--      held a table-level SELECT grant (column revokes don't override
--      table grants in Postgres). Fix: revoke table-level SELECT and
--      grant only the safe columns.
--   3. Any authenticated user could upload/overwrite ANY object in the
--      public 'avatars' bucket (no owner scoping, no type/size limits).
--
-- Ships with code change: src/app/profile/page.tsx must not select('*')
-- on profiles (it now names the granted columns explicitly).
-- ════════════════════════════════════════════════════════════════════

begin;

-- 1. jobs: RLS back on (policies jobs_owner_insert / jobs_owner_update /
--    jobs_read_open_or_own already exist and allow public browse of open jobs)
alter table public.jobs enable row level security;

-- 2. profiles: phone / phone_verified no longer client-readable.
revoke select on table public.profiles from anon, authenticated;
grant select (id, first_name, last_name, role, home_city, avatar_url, bio, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- 3. avatars: owner-scoped writes. Path convention: <userId>/<timestamp>.<ext>
--    (matches src/lib/actions/upload-avatar.ts). Public read stays — avatars
--    are profile pictures rendered via public URLs, and uploads are now
--    restricted to validated raster images.
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "avatars_owner_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Both public image buckets: real image types only, 5 MB cap.
update storage.buckets
  set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'],
      file_size_limit = 5242880
  where id in ('avatars','profile-photos');

commit;
