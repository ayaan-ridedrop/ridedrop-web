-- Add Stripe integration columns to support payments

-- 1. Add Stripe columns to carrier_profiles
alter table public.carrier_profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false;

-- 2. Create stripe_events table for webhook idempotency
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_events_processed on public.stripe_events(processed_at desc);

-- 3. Add transaction-related columns to bookings if not exists
alter table public.bookings
  add column if not exists transaction_id uuid references public.transactions(id);

-- 4. Ensure transactions table has all needed columns
-- (these should already exist from the delivery_and_payments migration)
-- but just to be safe:
alter table public.transactions
  add column if not exists held_at timestamptz,
  add column if not exists paid_out_at timestamptz;
