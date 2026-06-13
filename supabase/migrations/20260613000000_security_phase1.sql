-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Security Phase 1 (launch-blocking)
-- ────────────────────────────────────────────────────────────────────
-- Run order: AFTER 20260611160000_fix_escrow_window.sql.
--
-- ⚠️ BEFORE RUNNING:
--   1. Run on a BRANCH / staging project first, not prod.
--   2. Turn on Point-in-Time-Recovery backups.
--   3. After running, TEST the full cycle: signup → post job → bid →
--      accept → pay → pickup PIN → delivery PIN → payout. If signup or
--      delivery-confirm fails, see the notes at the bottom.
--
-- Closes: profiles data breach (RLS off), bookings money-theft via direct
-- client UPDATE, public leak of carrier Stripe IDs/earnings + user phones,
-- world-readable handover photos, message-sender spoofing.
--
-- Ships together with code change: src/lib/actions/confirm-delivery.ts must
-- write via the service-role client (this migration revokes client UPDATE on
-- bookings, so the old anon-client write would otherwise fail).
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── CRITICAL #1 — profiles: re-enable RLS (it was disabled "for testing") ──
-- RLS is the only gate; with it off, anyone with the public anon key can read
-- every name+phone and edit/delete any profile. The self-insert/self-update
-- policies already exist, so signup keeps working.
alter table public.profiles enable row level security;

-- HIGH #5 — hide phone numbers from the public read policy (PII). Names stay
-- readable (needed to display "James T." etc); phone does not.
revoke select (phone, phone_verified) on public.profiles from anon, authenticated;

-- ── HIGH #4 — carrier_profiles: stop leaking payment-infra identifiers ──
-- carrier_profiles_read is `using (true)`. Keep the safe public fields
-- (verification status, deliveries, rating) but hide Stripe account/identity
-- IDs, earnings and payout flag. Server code reads these via the service role,
-- which is unaffected.
revoke select (stripe_connect_account_id, stripe_identity_session_id,
               total_earnings_pence, payout_enabled)
  on public.carrier_profiles from anon, authenticated;

-- ── CRITICAL #2 — bookings: clients may NOT update bookings at all ──
-- Every legitimate booking mutation already runs through a SECURITY DEFINER
-- RPC (confirm_pickup / confirm_delivery / raise_dispute — they execute as the
-- function owner, so they bypass this) or the service role (webhook, payout
-- cron, the confirm-delivery action after its code change). Revoking client
-- UPDATE kills the attack where a carrier PATCHes their own booking to
-- status='completed' + paid_at=now + commission=0 + inflated price and tricks
-- the payout cron into wiring them money with no real charge.
revoke update on public.bookings from anon, authenticated;

-- ── MEDIUM #6 — messages: fix operator-precedence bug (sender spoofing) ──
-- Old policy parsed as (A and B) or C, where C never checked sender_id, so a
-- participant could post a message AS the other person.
drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert" on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
  )
);

-- ── NEW (found reconciling migrations) — handover photos were world-readable ──
-- The v3 policy was `using (bucket_id = 'handover-photos')` with NO scoping, so
-- any logged-in user could read every booking's pickup/delivery photos. Scope
-- read to that booking's participants. (Object `name` is the stored path; we
-- match it against the URL recorded on the booking.)
drop policy if exists "parties view handover photos" on storage.objects;
create policy "handover_photos_participant_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'handover-photos'
    and exists (
      select 1 from public.bookings b
      where (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
        and (position(name in coalesce(b.pickup_photo_url, '')) > 0
          or position(name in coalesce(b.delivery_photo_url, '')) > 0)
    )
  );

commit;

-- ════════════════════════════════════════════════════════════════════
-- NOTES / TROUBLESHOOTING (read if the post-migration test fails)
-- ────────────────────────────────────────────────────────────────────
-- • If SIGNUP breaks after enabling RLS on profiles, the profile row is being
--   inserted before the auth session exists. The correct fix is NOT to disable
--   RLS — it's to create the profile from a trigger on auth.users:
--
--     create or replace function public.handle_new_user()
--     returns trigger language plpgsql security definer set search_path=public as $$
--     begin
--       insert into public.profiles (id) values (new.id) on conflict do nothing;
--       return new;
--     end$$;
--     drop trigger if exists on_auth_user_created on auth.users;
--     create trigger on_auth_user_created after insert on auth.users
--       for each row execute function public.handle_new_user();
--
-- • If CONFIRM-DELIVERY breaks, make sure the code change to
--   src/lib/actions/confirm-delivery.ts (service-role write) shipped with this.
--
-- • If CONFIRM-PICKUP / CONFIRM-DELIVERY (the carrier PIN steps) break, the
--   SECURITY DEFINER RPCs aren't owned by a superuser role. Check with
--   `\df+ public.confirm_delivery` — the Owner must be able to UPDATE bookings.
--   On Supabase these are owned by `postgres`, which is unaffected by the
--   revoke above. If yours differ, re-run the RPC definitions as `postgres`.
-- ════════════════════════════════════════════════════════════════════
