-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Storage buckets + RLS policies
-- ────────────────────────────────────────────────────────────────────
-- Run AFTER schema.sql. Creates two private buckets and the RLS
-- policies that govern who can read/write objects in them.
-- ════════════════════════════════════════════════════════════════════

-- Bucket: tickets — carrier train ticket uploads (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tickets', 'tickets', false, 10 * 1024 * 1024, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Bucket: package-photos — pickup + delivery photos (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('package-photos', 'package-photos', false, 10 * 1024 * 1024, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- ── TICKETS bucket policies ──────────────────────────────────────
-- Object path convention: tickets/<carrier_id>/<journey_id>.<ext>

drop policy if exists "tickets_carrier_upload" on storage.objects;
create policy "tickets_carrier_upload" on storage.objects
  for insert with check (
    bucket_id = 'tickets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "tickets_carrier_read" on storage.objects;
create policy "tickets_carrier_read" on storage.objects
  for select using (
    bucket_id = 'tickets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "tickets_carrier_delete" on storage.objects;
create policy "tickets_carrier_delete" on storage.objects
  for delete using (
    bucket_id = 'tickets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── PACKAGE-PHOTOS bucket policies ──────────────────────────────
-- Object path convention: package-photos/<booking_id>/<pickup|delivery>.<ext>

-- A booking participant (sender or carrier) can upload to their booking's folder.
drop policy if exists "package_photos_participant_upload" on storage.objects;
create policy "package_photos_participant_upload" on storage.objects
  for insert with check (
    bucket_id = 'package-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
    )
  );

-- Same set of people can read their booking's photos.
drop policy if exists "package_photos_participant_read" on storage.objects;
create policy "package_photos_participant_read" on storage.objects
  for select using (
    bucket_id = 'package-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
    )
  );
