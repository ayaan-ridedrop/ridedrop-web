# Supabase setup

## One-time setup

1. Create a Supabase project at https://supabase.com (free tier is fine for now).
2. In the dashboard, go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the browser)
3. Paste these into `.env.local` in the project root (copy from `.env.example`).

## Running the schema

Open the **SQL editor** in your Supabase dashboard, paste the contents of `schema.sql`, and run it. It's safe to run more than once — every statement uses `if not exists` or `drop policy if exists ... create policy`.

## Local dev (optional)

If you install the Supabase CLI you can run a local Postgres + Supabase stack:

```bash
brew install supabase/tap/supabase
supabase init
supabase start
supabase db push   # applies schema.sql migrations
```

## Storage buckets

You'll need two storage buckets — create these manually in **Storage** in the dashboard:

- `tickets` — private, only the uploading carrier can read. Used for train ticket uploads.
- `package-photos` — private, only the booking's sender and carrier can read. Used for pickup/delivery photos.

Bucket policies aren't included in `schema.sql` yet — your dev should add them via the Supabase Storage UI.
