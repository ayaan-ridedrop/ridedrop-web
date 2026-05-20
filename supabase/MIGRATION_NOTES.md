# Supabase Migrations Guide

## How to apply migrations

1. **Option A: Supabase Dashboard (recommended for now)**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your RideDrop project
   - Go to SQL Editor
   - Create a new query
   - Copy + paste the contents of `migrations/20260521_auto_cancel_expired_jobs.sql`
   - Run the query
   - Done!

2. **Option B: Supabase CLI (for future)**
   ```bash
   supabase db push
   ```
   (requires Supabase CLI installed and configured)

## Current migrations

### 20260521_auto_cancel_expired_jobs.sql
Automatically cancels jobs when their `must_arrive_by` deadline passes.

**What it does:**
- Creates a PostgreSQL function `cancel_expired_jobs()` that marks old jobs as cancelled
- Creates a trigger `job_expiration_trigger` that runs when jobs are inserted/updated
- If a job's `must_arrive_by` is in the past, the job is automatically set to `cancelled` status

**Result:**
- Jobs past their deadline won't be created with "open" status
- Expired jobs are already marked "cancelled" in the database
- Dashboard and browse queries can filter `status != 'cancelled'` to hide them

## Next steps

After applying the migration:
1. Update dashboard/jobs browse queries to `WHERE status != 'cancelled'` (if not already done)
2. Test by creating a job with a past deadline - should auto-mark as cancelled
3. Monitor for any issues
