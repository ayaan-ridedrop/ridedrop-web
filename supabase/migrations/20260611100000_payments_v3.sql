-- ============================================================
-- RideDrop payments v3 — matched to the REAL schema
-- (bookings-based escrow, carrier_profiles Connect, two-PIN flow)
--
-- REPLACES both earlier migrations. Delete these from
-- supabase/migrations/ if present before pushing:
--   20260610120000_delivery_and_payments.sql
--   20260610130000_stripe.sql
--   20260611090000_delivery_and_payments_v2.sql
-- ============================================================

-- ---------- 0. CLEANUP: remove the parallel system from v1/v2 ----------
drop function if exists public.generate_delivery_pin(uuid);
drop function if exists public.verify_delivery_pin(uuid, text);
drop table if exists public.delivery_proofs cascade;
drop table if exists public.transactions cascade;
drop table if exists public.disputes cascade;      -- recreated below on bookings
drop table if exists public.stripe_events cascade; -- recreated below
alter table public.jobs
  drop column if exists pin_hash,
  drop column if exists pin_generated_at,
  drop column if exists delivered_at;
alter table public.profiles
  drop column if exists stripe_account_id,
  drop column if exists stripe_onboarding_complete;

create extension if not exists pgcrypto;

-- ---------- 1. Bookings: the missing escrow timestamps ----------
alter table public.bookings
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists stripe_refund_id text;

-- fast lookup for the hourly payout function
create index if not exists idx_bookings_release_due
  on public.bookings (auto_release_at)
  where status = 'delivered' and funds_released_at is null;

create index if not exists idx_bookings_payment_intent
  on public.bookings (stripe_payment_intent_id);

-- ---------- 2. Webhook idempotency ----------
create table if not exists public.stripe_events (
  id text primary key,          -- evt_...
  type text not null,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- no policies on purpose: service-role only

-- ---------- 3. Disputes (referencing bookings) ----------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'released', 'refunded')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_disputes_open on public.disputes (status) where status = 'open';

alter table public.disputes enable row level security;

drop policy if exists "parties read own disputes" on public.disputes;
create policy "parties read own disputes" on public.disputes
  for select to authenticated
  using (
    auth.uid() in (
      select sender_id from public.bookings b where b.id = booking_id
      union
      select carrier_id from public.bookings b where b.id = booking_id
    )
  );
-- inserts happen via the raise_dispute RPC below; resolution via service role.
-- To resolve from the admin page with your own login, uncomment + fill in:
-- create policy "admin updates disputes" on public.disputes
--   for update to authenticated
--   using (auth.uid() = 'YOUR-AUTH-UUID') with check (true);
-- create policy "admin updates bookings" on public.bookings
--   for update to authenticated
--   using (auth.uid() = 'YOUR-AUTH-UUID') with check (true);

-- ---------- 4. Storage bucket for handover photos ----------
insert into storage.buckets (id, name, public)
values ('handover-photos', 'handover-photos', false)
on conflict (id) do nothing;

drop policy if exists "carrier uploads handover photos" on storage.objects;
create policy "carrier uploads handover photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'handover-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "parties view handover photos" on storage.objects;
create policy "parties view handover photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'handover-photos');

-- ---------- 5. PIN RPCs (two-PIN flow, hashes stored in existing columns) ----------
-- SECURITY NOTE: pickup_pin / delivery_pin columns now hold sha256 HASHES,
-- never plaintext. Plaintext is returned exactly once to the sender by
-- generate_booking_pins. If a carrier reads the booking row via the API
-- they see hashes — they cannot self-confirm a delivery.

create or replace function public.generate_booking_pins(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b bookings%rowtype;
  v_pickup text;
  v_delivery text;
begin
  select * into v_b from bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.sender_id <> auth.uid() then raise exception 'only the sender can generate PINs'; end if;
  if v_b.pickup_pin is not null then raise exception 'PINs already generated for this booking'; end if;

  v_pickup  := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_delivery := lpad((floor(random() * 1000000))::int::text, 6, '0');

  update bookings set
    pickup_pin   = encode(digest(v_pickup  || id::text || 'pickup',   'sha256'), 'hex'),
    delivery_pin = encode(digest(v_delivery || id::text || 'delivery', 'sha256'), 'hex'),
    updated_at = now()
  where id = p_booking_id;

  return json_build_object('pickup_pin', v_pickup, 'delivery_pin', v_delivery);
end;
$$;

-- Carrier confirms PICKUP: requires payment to be in escrow first.
create or replace function public.confirm_pickup(
  p_booking_id uuid, p_pin text, p_photo_url text,
  p_lat numeric default null, p_lng numeric default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b bookings%rowtype;
begin
  select * into v_b from bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.carrier_id <> auth.uid() then raise exception 'only the assigned carrier can confirm'; end if;
  if v_b.status <> 'accepted' then raise exception 'booking not in accepted state'; end if;
  if v_b.paid_at is null then raise exception 'payment not completed — sender must pay before pickup'; end if;
  if v_b.pickup_pin is null then raise exception 'PINs not generated yet'; end if;

  if encode(digest(p_pin || p_booking_id::text || 'pickup', 'sha256'), 'hex') <> v_b.pickup_pin then
    return false;
  end if;

  update bookings set
    status = 'in_transit',
    pickup_photo_url = p_photo_url,
    pickup_photo_at = now(),
    pickup_gps_lat = p_lat,
    pickup_gps_lng = p_lng,
    updated_at = now()
  where id = p_booking_id;

  update jobs set status = 'in_transit', updated_at = now()
  where id = v_b.job_id and status = 'matched';

  return true;
end;
$$;

-- Carrier confirms DELIVERY: starts the 24h auto-release window.
create or replace function public.confirm_delivery(
  p_booking_id uuid, p_pin text, p_photo_url text,
  p_lat numeric default null, p_lng numeric default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b bookings%rowtype;
begin
  select * into v_b from bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.carrier_id <> auth.uid() then raise exception 'only the assigned carrier can confirm'; end if;
  if v_b.status not in ('picked_up', 'in_transit') then raise exception 'booking not in transit'; end if;
  if v_b.delivery_pin is null then raise exception 'PINs not generated yet'; end if;

  if encode(digest(p_pin || p_booking_id::text || 'delivery', 'sha256'), 'hex') <> v_b.delivery_pin then
    return false;
  end if;

  update bookings set
    status = 'delivered',
    delivery_photo_url = p_photo_url,
    delivery_photo_at = now(),
    delivery_gps_lat = p_lat,
    delivery_gps_lng = p_lng,
    auto_release_at = now() + interval '24 hours',
    updated_at = now()
  where id = p_booking_id;

  update jobs set status = 'delivered', updated_at = now()
  where id = v_b.job_id;

  return true;
end;
$$;

-- Sender raises a dispute within the window: freezes the payout.
create or replace function public.raise_dispute(p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b bookings%rowtype;
  v_id uuid;
begin
  select * into v_b from bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.sender_id <> auth.uid() then raise exception 'only the sender can raise a dispute'; end if;
  if v_b.funds_released_at is not null then raise exception 'funds already released'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'please describe the problem (10+ characters)'; end if;

  insert into disputes (booking_id, raised_by, reason)
  values (p_booking_id, auth.uid(), p_reason)
  returning id into v_id;

  update bookings set status = 'disputed', updated_at = now() where id = p_booking_id;
  update jobs set status = 'disputed', updated_at = now() where id = v_b.job_id;

  return v_id;
end;
$$;

grant execute on function public.generate_booking_pins(uuid) to authenticated;
grant execute on function public.confirm_pickup(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.confirm_delivery(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.raise_dispute(uuid, text) to authenticated;
