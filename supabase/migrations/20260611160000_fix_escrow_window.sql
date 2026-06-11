-- ============================================================
-- Fix: remove the auto-complete trigger that bypassed the
-- 24-hour dispute window.
--
-- Before this migration, setting delivery_photo_url on a booking in
-- status 'delivered' instantly flipped it to 'completed', skipping the
-- 24h period in which the sender can raise a dispute. The v3 flow sets
-- the photo inside confirm_delivery() and starts the window via
-- auto_release_at; completion happens when funds are actually released.
--
-- HOW TO APPLY: paste this whole file into the Supabase SQL editor and
-- run it (or `supabase db push` if using the CLI).
-- ============================================================

drop trigger if exists auto_complete_booking on public.bookings;
drop function if exists public.tg_auto_complete_booking();

-- Also remove it from future schema rebuilds: tg_auto_complete_booking
-- should be deleted from supabase/schema.sql if the schema is ever
-- re-applied from scratch. (schema.sql updated in the same commit.)
