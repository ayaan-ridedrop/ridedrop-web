-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Profile photos: private, visible only to a booking counterparty
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ APPLIED MANUALLY to production via the SQL editor on 2026-07-05.
--
-- Product rule: a user's profile photo must NOT be public. It becomes
-- visible to the OTHER party only once they share an accepted-or-later
-- booking, so sender and carrier can recognise each other at the station.
-- During bidding (booking status 'proposed', or no booking) photos stay
-- hidden — the app shows initials.
--
-- Ships with code: avatars are now rendered via short-lived signed URLs
-- (src/lib/avatar.ts); BidsList/reviews show initials; signup + upload-avatar
-- write to this bucket with path <userId>/<ts>.<ext> and store that path in
-- profiles.avatar_url.
-- ════════════════════════════════════════════════════════════════════

begin;

-- Both public image buckets become private. profile-photos is now unused
-- (signup writes to avatars); locking it removes a stray public surface.
update storage.buckets set public = false where id in ('avatars', 'profile-photos');

-- Drop any public read on avatars.
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "Anyone can read avatars" on storage.objects;

-- Owner can always read their own avatar (profile page, edit form).
drop policy if exists "avatars_owner_read" on storage.objects;
create policy "avatars_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Counterparty may read once they share an accepted-or-later booking with the
-- photo's owner. 'proposed' (pre-acceptance) and 'cancelled' are excluded.
drop policy if exists "avatars_counterparty_read" on storage.objects;
create policy "avatars_counterparty_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.bookings b
      where b.status in ('accepted','picked_up','in_transit','delivered','completed','disputed')
        and (
          (b.sender_id  = auth.uid() and b.carrier_id::text = (storage.foldername(name))[1])
          or
          (b.carrier_id = auth.uid() and b.sender_id::text  = (storage.foldername(name))[1])
        )
    )
  );

commit;
