-- Create transactions table for marketplace escrow and payment tracking
-- This is the source of truth for all payment logic in RideDrop

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  -- Foreign keys to jobs and profiles
  job_id uuid references public.jobs(id) on delete restrict not null,
  sender_id uuid references public.profiles(id) on delete restrict not null,
  carrier_id uuid references public.profiles(id) on delete restrict not null,

  -- Money in pence (GBP), never floats
  amount_total integer not null,        -- total amount sender pays
  amount_fee integer not null,          -- ridedrop's 20% cut
  amount_carrier integer not null,      -- what carrier receives after fee
  currency text default 'gbp' not null,

  -- Stripe integration
  stripe_payment_intent_id text unique,
  stripe_transfer_id text,              -- set when money actually transfers to carrier

  -- State machine: pending → held → released → paid_out
  -- or: pending → held → disputed (manual review)
  -- or: pending → held → refunded
  status text not null default 'pending',

  -- Timestamps for audit trail and dispute windows
  created_at timestamptz default now() not null,
  released_at timestamptz,              -- when PIN was entered / dispute window started
  paid_out_at timestamptz,              -- when Stripe transfer completed
  refunded_at timestamptz,              -- when refund happened

  -- Dispute tracking
  dispute_reason text,
  disputed_by_id uuid references public.profiles(id) on delete set null,
  disputed_at timestamptz,

  -- Metadata
  notes text,

  constraints check_amounts (amount_carrier + amount_fee = amount_total),
  constraint check_status check (status in ('pending', 'held', 'released', 'paid_out', 'refunded', 'disputed'))
);

-- Indexes for common queries
create index idx_transactions_job_id on public.transactions(job_id);
create index idx_transactions_carrier_id on public.transactions(carrier_id);
create index idx_transactions_sender_id on public.transactions(sender_id);
create index idx_transactions_status on public.transactions(status);
create index idx_transactions_status_created on public.transactions(status, created_at desc);
create index idx_transactions_carrier_status on public.transactions(carrier_id, status);
create index idx_transactions_created_at on public.transactions(created_at desc);
create index idx_transactions_stripe_payment_intent on public.transactions(stripe_payment_intent_id);

-- Enable RLS
alter table public.transactions enable row level security;

-- RLS Policy: Users can view their own transactions (as sender or carrier)
create policy "Users can view their own transactions"
  on public.transactions
  for select
  using (
    auth.uid() = sender_id
    or auth.uid() = carrier_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS Policy: Only service role can insert/update transactions
-- (payments created via API routes, not client-side)
create policy "Service role manages transactions"
  on public.transactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
