-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260613000000_security_phase1.sql
-- ────────────────────────────────────────────────────────────────────
-- ONLY run this if the security migration broke a working flow (e.g.
-- signup) and you need to get back to the previous behaviour fast.
--
-- ⚠️ NOTE: this restores the INSECURE previous state (RLS off on profiles,
-- data leaks, etc.). It is an emergency undo, not a place to stop. If you
-- run it, tell Claude so we can diagnose what broke and re-apply the fix
-- the right way.
-- ════════════════════════════════════════════════════════════════════

begin;

-- Undo CRITICAL #1 — turn profiles RLS back off (INSECURE)
alter table public.profiles disable row level security;

-- Undo HIGH #5 — restore public read of phone columns
grant select (phone, phone_verified) on public.profiles to anon, authenticated;

-- Undo HIGH #4 — restore public read of carrier payment identifiers
grant select (stripe_connect_account_id, stripe_identity_session_id,
              total_earnings_pence, payout_enabled)
  on public.carrier_profiles to anon, authenticated;

-- Undo CRITICAL #2 — restore client UPDATE on bookings (INSECURE)
grant update on public.bookings to anon, authenticated;

-- Undo MEDIUM #6 — restore the old (buggy) messages insert policy
drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert" on public.messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
  )
  or exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and b.carrier_id = auth.uid()
  )
);

-- Undo handover-photos scoping — restore the old world-readable policy
drop policy if exists "handover_photos_participant_read" on storage.objects;
create policy "parties view handover photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'handover-photos');

commit;
