-- ============================================================
-- RideDrop: delivery proof + payments foundation
-- Run via: supabase db push  (or paste into SQL editor once,
-- then commit this file so history is tracked going forward)
--
-- ASSUMPTIONS (rename if yours differ):
--   - jobs table:      public.jobs (id uuid pk, sender_id uuid, carrier_id uuid, status text)
--   - profiles table:  public.profiles (id uuid pk = auth.users.id)
-- ============================================================

-- ---------- 1. Job lifecycle columns ----------
alter table public.jobs
  add column if not exists pin_hash text,
  add column if not exists pin_generated_at timestamptz,
  add column if not exists delivered_at timestamptz;

-- Single source of truth for job states (adjust list to match yours)
do $$ begin
  alter table public.jobs
    add constraint jobs_status_check
    check (status in (
      'posted', 'bid_accepted', 'in_transit',
      'delivered', 'disputed', 'completed', 'cancelled'
    )) not valid; -- NOT VALID so existing rows don't block; validate later
exception when duplicate_object then null;
end $$;

-- ---------- 2. Transactions ledger ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  sender_id uuid not null references public.profiles(id),
  carrier_id uuid not null references public.profiles(id),

  -- money in integer pence. NEVER floats.
  amount_total integer not null check (amount_total > 0),
  amount_fee integer not null check (amount_fee >= 0),
  amount_carrier integer not null check (amount_carrier >= 0),
  currency text not null default 'gbp',

  -- Stripe refs (null until Stripe is wired in)
  stripe_payment_intent_id text unique,
  stripe_transfer_id text,
  stripe_refund_id text,

  status text not null default 'pending' check (status in (
    'pending',    -- created, awaiting payment
    'held',       -- payment captured, in escrow
    'released',   -- PIN entered, 24h dispute window running
    'paid_out',   -- transferred to carrier
    'disputed',   -- sender disputed within window
    'refunded'    -- refunded to sender
  )),

  created_at timestamptz not null default now(),
  held_at timestamptz,
  released_at timestamptz,
  paid_out_at timestamptz,
  refunded_at timestamptz,

  constraint amounts_add_up check (amount_fee + amount_carrier = amount_total),
  constraint one_transaction_per_job unique (job_id)
);

create index if not exists idx_transactions_status on public.transactions (status);
create index if not exists idx_transactions_release_due
  on public.transactions (released_at) where status = 'released';
create index if not exists idx_transactions_carrier on public.transactions (carrier_id);
create index if not exists idx_transactions_sender on public.transactions (sender_id);

-- ---------- 3. Delivery proofs ----------
create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  carrier_id uuid not null references public.profiles(id),
  photo_path text not null,          -- storage path in 'delivery-proofs' bucket
  photo_sha256 text,                 -- duplicate-photo fraud flag
  pin_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_proofs_job on public.delivery_proofs (job_id);
-- duplicate photo across different jobs = fraud signal (query in reconciliation)
create index if not exists idx_delivery_proofs_hash on public.delivery_proofs (photo_sha256);

-- ---------- 4. Disputes ----------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  transaction_id uuid references public.transactions(id),
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'released', 'refunded')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_disputes_open on public.disputes (status) where status = 'open';

-- ---------- 5. RLS ----------
alter table public.transactions enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.disputes enable row level security;

-- parties to a job can see its money state; nobody writes directly (RPCs/server only)
drop policy if exists "parties read own transactions" on public.transactions;
create policy "parties read own transactions" on public.transactions
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = carrier_id);

drop policy if exists "parties read own proofs" on public.delivery_proofs;
create policy "parties read own proofs" on public.delivery_proofs
  for select to authenticated
  using (
    auth.uid() = carrier_id
    or auth.uid() = (select sender_id from public.jobs j where j.id = job_id)
  );

drop policy if exists "carrier inserts proof" on public.delivery_proofs;
create policy "carrier inserts proof" on public.delivery_proofs
  for insert to authenticated
  with check (auth.uid() = carrier_id);

drop policy if exists "parties read own disputes" on public.disputes;
create policy "parties read own disputes" on public.disputes
  for select to authenticated
  using (
    auth.uid() = raised_by
    or auth.uid() in (
      select sender_id from public.jobs j where j.id = job_id
      union
      select carrier_id from public.jobs j where j.id = job_id
    )
  );

drop policy if exists "sender raises dispute" on public.disputes;
create policy "sender raises dispute" on public.disputes
  for insert to authenticated
  with check (auth.uid() = raised_by);

-- ---------- 6. Storage bucket for proof photos ----------
insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', false)
on conflict (id) do nothing;

drop policy if exists "carrier uploads own proof photos" on storage.objects;
create policy "carrier uploads own proof photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "parties view proof photos" on storage.objects;
create policy "parties view proof photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-proofs');

-- ---------- 7. PIN RPCs (security definer: hash never leaves the DB) ----------

-- Sender calls this once after a bid is accepted. Returns the plain PIN
-- exactly once; only the hash is stored.
create or replace function public.generate_delivery_pin(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text;
  v_sender uuid;
begin
  select sender_id into v_sender from jobs where id = p_job_id;
  if v_sender is null then raise exception 'job not found'; end if;
  if v_sender <> auth.uid() then raise exception 'only the sender can generate the PIN'; end if;

  v_pin := lpad((floor(random() * 1000000))::int::text, 6, '0');

  update jobs
  set pin_hash = encode(digest(v_pin || id::text, 'sha256'), 'hex'),
      pin_generated_at = now()
  where id = p_job_id;

  return v_pin;
end;
$$;

-- Carrier calls this at handover. On success: marks job delivered,
-- flags proof row, and (if a held transaction exists) starts the
-- 24h release window.
create or replace function public.verify_delivery_pin(p_job_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs%rowtype;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job.id is null then raise exception 'job not found'; end if;
  if v_job.carrier_id <> auth.uid() then raise exception 'only the assigned carrier can verify'; end if;
  if v_job.pin_hash is null then raise exception 'no PIN set for this job'; end if;

  if encode(digest(p_pin || p_job_id::text, 'sha256'), 'hex') <> v_job.pin_hash then
    return false;
  end if;

  update jobs set status = 'delivered', delivered_at = now() where id = p_job_id;
  update delivery_proofs set pin_verified = true where job_id = p_job_id;
  update transactions
    set status = 'released', released_at = now()
    where job_id = p_job_id and status = 'held';

  return true;
end;
$$;

-- needed for digest()
create extension if not exists pgcrypto;

grant execute on function public.generate_delivery_pin(uuid) to authenticated;
grant execute on function public.verify_delivery_pin(uuid, text) to authenticated;
