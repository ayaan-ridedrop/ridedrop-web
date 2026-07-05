-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Carrier refuse-and-report at pickup
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ APPLIED MANUALLY to production via the SQL editor on 2026-07-05.
--
-- Trust & safety: the existing raise_dispute RPC is SENDER-ONLY, so a carrier
-- who finds a package that isn't as described (or looks prohibited/dangerous)
-- had no safe way to decline — they could only confirm pickup or walk away
-- silently. This adds a carrier-side equivalent, usable ONLY at the pickup
-- stage (booking status 'accepted', before pickup is confirmed).
--
-- It mirrors raise_dispute: inserts a dispute row (so it lands in the admin
-- queue) and flips the booking + job to 'disputed', which holds any payout
-- (the payout cron only pays 'completed'/'delivered' bookings). Admin then
-- resolves via the existing disputes flow (refund the sender, etc.).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.carrier_refuse_pickup(p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_b bookings%rowtype;
  v_id uuid;
begin
  select * into v_b from bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.carrier_id <> auth.uid() then raise exception 'only the assigned carrier can refuse this pickup'; end if;
  if v_b.status <> 'accepted' then raise exception 'a pickup can only be refused before it is confirmed'; end if;
  if v_b.funds_released_at is not null then raise exception 'funds already released'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'please describe the problem (10+ characters)'; end if;

  insert into disputes (booking_id, raised_by, reason)
  values (p_booking_id, auth.uid(), 'CARRIER REFUSED AT PICKUP: ' || trim(p_reason))
  returning id into v_id;

  update bookings set status = 'disputed', updated_at = now() where id = p_booking_id;
  update jobs     set status = 'disputed', updated_at = now() where id = v_b.job_id;

  return v_id;
end;
$$;

grant execute on function public.carrier_refuse_pickup(uuid, text) to authenticated;
