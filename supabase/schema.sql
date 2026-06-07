-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Database Schema (Supabase / Postgres)
-- ────────────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (or `supabase db push` locally).
-- It's idempotent-ish: uses `if not exists` where possible.
--
-- Order: enums → tables → indexes → RLS policies → triggers.
-- ════════════════════════════════════════════════════════════════════

-- ── ENUMS ─────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('sender', 'carrier', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type journey_status as enum (
    'draft', 'ticket_pending', 'ticket_rejected', 'listed', 'full', 'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum (
    'draft', 'open', 'matched', 'in_transit', 'delivered', 'completed', 'disputed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum (
    'proposed', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'disputed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type package_size as enum ('small', 'medium', 'large');
exception when duplicate_object then null; end $$;

do $$ begin
  create type id_verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

-- ── PROFILES (1:1 with auth.users) ────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  first_name        text,
  last_name         text,
  phone             text,
  phone_verified    boolean not null default false,
  role              user_role not null default 'sender',
  home_city         text,
  avatar_url        text,
  bio               text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── CARRIER PROFILES ──────────────────────────────────────────────
-- Extra info that only applies to carriers. 1:1 with profiles.
create table if not exists public.carrier_profiles (
  id                          uuid primary key references public.profiles(id) on delete cascade,
  id_verification_status      id_verification_status not null default 'unverified',
  id_verified_at              timestamptz,
  stripe_identity_session_id  text,
  stripe_connect_account_id   text,
  payout_enabled              boolean not null default false,
  total_deliveries            integer not null default 0,
  total_earnings_pence        bigint not null default 0,
  average_rating              numeric(3,2),
  food_ok_default             boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ── JOURNEYS (a carrier's listed train trip) ──────────────────────
create table if not exists public.journeys (
  id                uuid primary key default gen_random_uuid(),
  carrier_id        uuid not null references public.profiles(id) on delete cascade,
  from_station      text not null,
  to_station        text not null,
  departure_at      timestamptz not null,
  arrival_at        timestamptz not null,
  train_operator    text,
  train_number      text,
  capacity          integer not null default 1 check (capacity between 1 and 5),
  slots_remaining   integer not null default 1,
  minimum_price_pence integer not null check (minimum_price_pence >= 0),
  max_weight_kg     numeric(5,2) not null default 5,
  food_ok           boolean not null default false,
  ticket_url        text,
  ticket_verified_at timestamptz,
  status            journey_status not null default 'draft',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (arrival_at > departure_at)
);

-- ── JOBS (a sender's delivery request) ────────────────────────────
create table if not exists public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  sender_id           uuid not null references public.profiles(id) on delete cascade,
  from_station        text not null,
  to_station          text not null,
  pickup_address      text,
  delivery_address    text,
  must_arrive_by      timestamptz,
  package_description text not null,
  package_category    text,
  package_size        package_size not null default 'small',
  package_weight_kg   numeric(5,2),
  declared_value_pence integer not null default 0,
  declaration_accepted boolean not null default false,
  status              job_status not null default 'open',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (declaration_accepted = true)
);

-- ── BOOKINGS (a job matched to a journey) ─────────────────────────
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references public.jobs(id) on delete cascade,
  journey_id          uuid not null references public.journeys(id) on delete cascade,
  sender_id           uuid not null references public.profiles(id) on delete cascade,
  carrier_id          uuid not null references public.profiles(id) on delete cascade,
  agreed_price_pence  integer not null check (agreed_price_pence > 0),
  commission_pence    integer not null default 0,
  status              booking_status not null default 'proposed',
  pickup_pin          text,        -- 4-digit PIN sender shares at pickup
  delivery_pin        text,        -- 4-digit PIN recipient shares at delivery
  pickup_photo_url    text,
  pickup_photo_at     timestamptz,
  pickup_gps_lat      numeric(9,6),  -- explicit GPS captured at upload time
  pickup_gps_lng      numeric(9,6),
  delivery_photo_url  text,
  delivery_photo_at   timestamptz,
  delivery_gps_lat    numeric(9,6),
  delivery_gps_lng    numeric(9,6),
  stripe_payment_intent_id text,
  stripe_transfer_id  text,
  funds_released_at   timestamptz,
  auto_release_at     timestamptz, -- 24h after delivery photo
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (job_id)               -- a job has at most one active booking
);

-- ── BIDS (carrier offers specific journey on a job) ────────────────
create table if not exists public.bids (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  journey_id    uuid not null references public.journeys(id) on delete cascade,
  carrier_id    uuid not null references public.profiles(id) on delete cascade,
  amount_pence  integer not null check (amount_pence > 0),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, carrier_id, journey_id)
);

-- ── MESSAGES (in-app chat between sender and carrier) ─────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(body) between 1 and 2000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ── REVIEWS (two-way after every completed booking) ───────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid not null references public.profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  is_auto     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

-- ── DISPUTES ──────────────────────────────────────────────────────
create table if not exists public.disputes (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  raised_by   uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  description text,
  status      text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  resolution_notes text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ── TRUST TIER VIEW ───────────────────────────────────────────────
-- Derived from total deliveries + dispute count + rating. Read-only.
-- Tiers:
--   'basic'   — phone verified only
--   'verified' — ID verified
--   'trusted'  — verified AND 5+ deliveries AND no recent disputes AND rating >= 4.5
create or replace view public.user_trust as
select
  p.id,
  case
    when cp.id_verification_status = 'verified'
         and coalesce(cp.total_deliveries, 0) >= 5
         and coalesce(cp.average_rating, 0) >= 4.5
      then 'trusted'
    when cp.id_verification_status = 'verified'
      then 'verified'
    else 'basic'
  end as trust_tier,
  coalesce(cp.total_deliveries, 0) as total_deliveries,
  cp.average_rating
from public.profiles p
left join public.carrier_profiles cp on cp.id = p.id;

-- Max declared value a sender of a given trust tier can use on a job.
-- (Carriers shouldn't accept higher; UI also enforces.)
create or replace function public.max_declared_value_pence(tier text)
returns integer language sql immutable as $$
  select case tier
    when 'basic' then 5000        -- £50
    when 'verified' then 25000    -- £250
    when 'trusted' then 100000    -- £1,000
    else 5000
  end
$$;

-- ── WAITLIST (landing page signups) ───────────────────────────────
create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  name         text,
  role_interest text check (role_interest in ('sender','carrier','both')),
  city         text,
  source       text, -- 'landing', 'investor', etc
  created_at   timestamptz not null default now()
);

-- ── INDEXES ───────────────────────────────────────────────────────
-- Route + time indexes
create index if not exists journeys_route_idx on public.journeys (from_station, to_station, departure_at);
create index if not exists journeys_status_idx on public.journeys (status) where status = 'listed';
create index if not exists journeys_carrier_status_idx on public.journeys (carrier_id, status, departure_at);
create index if not exists journeys_departure_idx on public.journeys (departure_at) where status in ('listed', 'in_progress');

create index if not exists jobs_route_idx on public.jobs (from_station, to_station, must_arrive_by);
create index if not exists jobs_status_idx on public.jobs (status) where status = 'open';
create index if not exists jobs_sender_status_idx on public.jobs (sender_id, status, created_at);
create index if not exists jobs_deadline_idx on public.jobs (must_arrive_by) where status != 'completed';

-- User-centric lookups
create index if not exists bookings_carrier_idx on public.bookings (carrier_id, status);
create index if not exists bookings_sender_idx on public.bookings (sender_id, status);
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists journeys_carrier_created_idx on public.journeys (carrier_id, created_at desc);
create index if not exists jobs_sender_created_idx on public.jobs (sender_id, created_at desc);

-- Chat & messaging
create index if not exists messages_booking_idx on public.messages (booking_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

-- Bidding
create index if not exists bids_job_idx on public.bids (job_id, status);
create index if not exists bids_carrier_idx on public.bids (carrier_id, created_at desc);
create index if not exists bids_journey_idx on public.bids (journey_id, status);

-- Reviews & ratings
create index if not exists reviews_subject_idx on public.reviews (subject_id, created_at desc);
create index if not exists reviews_booking_idx on public.reviews (booking_id);

-- Disputes
create index if not exists disputes_status_idx on public.disputes (status) where status in ('open', 'reviewing');
create index if not exists disputes_booking_idx on public.disputes (booking_id);

-- ════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- Default deny — every table has RLS on and explicit policies.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.carrier_profiles enable row level security;
alter table public.journeys enable row level security;
alter table public.jobs enable row level security;
alter table public.bookings enable row level security;
alter table public.bids enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.waitlist enable row level security;

-- ── AUTO-CREATE PROFILE ON SIGNUP ──
-- Trigger: When new user is created in auth.users, automatically create profile row
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'sender'
  );
  return new;
exception when others then
  return new; -- Don't fail signup if profile creation fails
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- profiles: anyone signed in can read (we hide sensitive fields client-side), only self can write
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- carrier_profiles: public read of verification status, self write
drop policy if exists "carrier_profiles_read" on public.carrier_profiles;
create policy "carrier_profiles_read" on public.carrier_profiles for select using (true);

drop policy if exists "carrier_profiles_self_upsert" on public.carrier_profiles;
create policy "carrier_profiles_self_upsert" on public.carrier_profiles for insert with check (auth.uid() = id);

drop policy if exists "carrier_profiles_self_update" on public.carrier_profiles;
create policy "carrier_profiles_self_update" on public.carrier_profiles for update using (auth.uid() = id);

-- journeys: public read of 'listed' journeys, owner sees own drafts, owner writes own
drop policy if exists "journeys_read_listed_or_own" on public.journeys;
create policy "journeys_read_listed_or_own" on public.journeys for select using (
  status = 'listed' or carrier_id = auth.uid()
);

drop policy if exists "journeys_owner_insert" on public.journeys;
create policy "journeys_owner_insert" on public.journeys for insert with check (carrier_id = auth.uid());

drop policy if exists "journeys_owner_update" on public.journeys;
create policy "journeys_owner_update" on public.journeys for update using (carrier_id = auth.uid());

drop policy if exists "journeys_owner_delete" on public.journeys;
create policy "journeys_owner_delete" on public.journeys for delete using (carrier_id = auth.uid());

-- jobs: public read of 'open' jobs, owner sees own at any status, booking participants can read booked jobs
drop policy if exists "jobs_read_open_or_own" on public.jobs;
create policy "jobs_read_open_or_own" on public.jobs for select using (
  status = 'open'
  or sender_id = auth.uid()
  or exists (
    select 1 from public.bookings b
    where b.job_id = jobs.id
      and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
  )
);

drop policy if exists "jobs_owner_insert" on public.jobs;
create policy "jobs_owner_insert" on public.jobs for insert with check (sender_id = auth.uid());

drop policy if exists "jobs_owner_update" on public.jobs;
create policy "jobs_owner_update" on public.jobs for update using (sender_id = auth.uid());

-- bookings: only participants (sender or carrier) can read or write
drop policy if exists "bookings_participants_read" on public.bookings;
create policy "bookings_participants_read" on public.bookings for select using (
  sender_id = auth.uid() or carrier_id = auth.uid()
);

drop policy if exists "bookings_participants_insert" on public.bookings;
create policy "bookings_participants_insert" on public.bookings for insert with check (
  sender_id = auth.uid() or carrier_id = auth.uid()
);

drop policy if exists "bookings_participants_update" on public.bookings;
create policy "bookings_participants_update" on public.bookings for update using (
  sender_id = auth.uid() or carrier_id = auth.uid()
);

-- messages: only booking participants
drop policy if exists "messages_participants_read" on public.messages;
create policy "messages_participants_read" on public.messages for select using (
  exists (
    select 1 from public.bookings b
    where b.id = messages.booking_id
      and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
  )
);

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

-- reviews: public read, write only by booking participants
drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select using (true);

drop policy if exists "reviews_participants_insert" on public.reviews;
create policy "reviews_participants_insert" on public.reviews for insert with check (
  reviewer_id = auth.uid() and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
      and b.status in ('delivered', 'completed')
  )
);

-- disputes: participants only
drop policy if exists "disputes_participants_read" on public.disputes;
create policy "disputes_participants_read" on public.disputes for select using (
  exists (
    select 1 from public.bookings b
    where b.id = disputes.booking_id
      and (b.sender_id = auth.uid() or b.carrier_id = auth.uid())
  )
);

drop policy if exists "disputes_participants_insert" on public.disputes;
create policy "disputes_participants_insert" on public.disputes for insert with check (
  raised_by = auth.uid()
);

-- bids: carriers can read bids on open jobs, senders can read/manage bids on own jobs
drop policy if exists "bids_carrier_read" on public.bids;
create policy "bids_carrier_read" on public.bids for select using (
  carrier_id = auth.uid()
  or exists (
    select 1 from public.jobs j
    where j.id = bids.job_id
      and j.status = 'open'
      and j.sender_id = auth.uid()
  )
);

drop policy if exists "bids_carrier_insert" on public.bids;
create policy "bids_carrier_insert" on public.bids for insert with check (
  carrier_id = auth.uid()
  and exists (
    select 1 from public.jobs j
    where j.id = job_id and j.status = 'open'
  )
);

drop policy if exists "bids_sender_update" on public.bids;
create policy "bids_sender_update" on public.bids for update using (
  exists (
    select 1 from public.jobs j
    where j.id = bids.job_id and j.sender_id = auth.uid()
  )
);

-- waitlist: anyone (including anon) can insert, nobody can read via API
drop policy if exists "waitlist_anon_insert" on public.waitlist;
create policy "waitlist_anon_insert" on public.waitlist for insert with check (true);
-- (no select policy → no reads from client; query via service role only)

-- ── PIN GENERATION ────────────────────────────────────────────────
-- Booking PINs are 4-digit strings auto-generated when a booking is
-- created. Sender shares pickup PIN at handover; carrier shares delivery
-- PIN at drop-off.
create or replace function public.generate_pin() returns text
language sql volatile as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0')
$$;

-- ── TRIGGERS ──────────────────────────────────────────────────────

-- Keep updated_at fresh.
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Capitalize first letter of first_name and last_name
create or replace function public.tg_capitalize_names() returns trigger
language plpgsql as $$
begin
  if new.first_name is not null then
    new.first_name := upper(substring(new.first_name, 1, 1)) || lower(substring(new.first_name, 2));
  end if;
  if new.last_name is not null then
    new.last_name := upper(substring(new.last_name, 1, 1)) || lower(substring(new.last_name, 2));
  end if;
  return new;
end $$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists capitalize_names on public.profiles;
create trigger capitalize_names before insert or update on public.profiles
  for each row execute function public.tg_capitalize_names();

drop trigger if exists set_updated_at on public.carrier_profiles;
create trigger set_updated_at before update on public.carrier_profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.journeys;
create trigger set_updated_at before update on public.journeys
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.jobs;
create trigger set_updated_at before update on public.jobs
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.bookings;
create trigger set_updated_at before update on public.bookings
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.bids;
create trigger set_updated_at before update on public.bids
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.tg_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'sender')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- When a booking is accepted: decrement journey slots, flip journey to 'full'
-- if no slots left, and flip the job to 'matched'. Runs as SECURITY DEFINER
-- so it can cross RLS boundaries (a carrier doesn't directly own the job row).
-- Also auto-generates the pickup + delivery PINs at insert time.
create or replace function public.tg_booking_acceptance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Auto-generate PINs on INSERT if not already set.
  if tg_op = 'INSERT' then
    if new.pickup_pin is null then new.pickup_pin := public.generate_pin(); end if;
    if new.delivery_pin is null then new.delivery_pin := public.generate_pin(); end if;
  end if;

  if (tg_op = 'INSERT' and new.status = 'accepted')
     or (tg_op = 'UPDATE' and old.status <> 'accepted' and new.status = 'accepted') then
    update public.journeys
      set slots_remaining = slots_remaining - 1,
          status = case when slots_remaining - 1 <= 0 then 'full'::journey_status else status end
      where id = new.journey_id;
    update public.jobs
      set status = 'matched'
      where id = new.job_id and status = 'open';
  end if;

  -- On completion (carrier delivered + sender confirmed), bump carrier stats.
  if tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed' then
    update public.carrier_profiles
      set total_deliveries = total_deliveries + 1,
          total_earnings_pence = total_earnings_pence
            + (new.agreed_price_pence - new.commission_pence)
      where id = new.carrier_id;
  end if;
  return new;
end $$;

-- Note: BEFORE on insert so PINs are set in NEW before the row hits disk,
-- and AFTER on update so the cross-table side effects see the new state.
drop trigger if exists booking_acceptance_before on public.bookings;
create trigger booking_acceptance_before before insert on public.bookings
  for each row execute function public.tg_booking_acceptance();

drop trigger if exists booking_acceptance_after on public.bookings;
create trigger booking_acceptance_after after insert or update on public.bookings
  for each row execute function public.tg_booking_acceptance();

-- ── REVIEW SIDE-EFFECTS ───────────────────────────────────────────
-- When a review is inserted, recompute the subject's average_rating.
create or replace function public.tg_review_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.carrier_profiles
    set average_rating = (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where subject_id = new.subject_id
    )
    where id = new.subject_id;
  return new;
end $$;

drop trigger if exists review_recompute on public.reviews;
create trigger review_recompute after insert on public.reviews
  for each row execute function public.tg_review_recompute();

-- ── AUTO-COMPLETE BOOKINGS ────────────────────────────────────────
-- When delivery photo is uploaded (delivery_photo_url is set), auto-mark as 'completed'.
create or replace function public.tg_auto_complete_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- If delivery_photo_url was just set and booking is in 'delivered', mark as 'completed'
  if new.delivery_photo_url is not null 
     and old.delivery_photo_url is null 
     and new.status = 'delivered' then
    new.status := 'completed';
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists auto_complete_booking on public.bookings;
create trigger auto_complete_booking before update on public.bookings
  for each row execute function public.tg_auto_complete_booking();

-- ── COMPLETE MATCHED JOBS ────────────────────────────────────────
-- When a booking is completed, mark its job as completed too.
create or replace function public.complete_matched_jobs()
returns void as $$
begin
  update public.jobs j
  set status = 'completed'
  where j.status = 'matched'
    and exists (
      select 1 from public.bookings b
      where b.job_id = j.id
        and b.status = 'completed'
    );
end;
$$ language plpgsql security definer;

-- ── CLEANUP ORPHANED MATCHED JOBS ────────────────────────────────────
-- If a job is 'matched' but has no active booking, revert it to 'open'.
-- Runs periodically (via cron) or on-demand.
create or replace function public.cleanup_orphaned_jobs()
returns void as $$
begin
  update public.jobs j
  set status = 'open'
  where j.status = 'matched'
    and not exists (
      select 1 from public.bookings b
      where b.job_id = j.id
        and b.status in ('accepted', 'picked_up', 'in_transit', 'delivered', 'completed')
    );
end;
$$ language plpgsql security definer;

-- ── DELETE EXPIRED JOBS FROM HISTORY ─────────────────────────────
-- Remove incomplete jobs 48+ hours after their deadline has passed.
-- Completed jobs are kept forever (in history/Completed tab).
-- Only delete jobs that are open/matched/cancelled (not completed).
create or replace function public.delete_expired_jobs_from_history()
returns void as $$
begin
  delete from public.jobs j
  where j.must_arrive_by is not null
    and j.must_arrive_by < NOW() - INTERVAL '48 hours'
    and j.status != 'completed';
end;
$$ language plpgsql security definer;
