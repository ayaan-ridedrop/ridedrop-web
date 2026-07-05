-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Restore signup profile-creation trigger
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ APPLIED MANUALLY to production via the SQL editor on 2026-07-05.
-- This file records it so the repo matches the live database.
--
-- BUG FOUND (pre-existing, not caused by the security work): the
-- `on_auth_user_created` trigger on auth.users had been dropped (there is a
-- saved dashboard query "Remove Auth User Created Trigger"). The signup code
-- (src/app/signup/SignupForm.tsx) calls supabase.auth.signUp and passes
-- first_name/last_name in metadata, but never inserts a profiles row itself —
-- it relies entirely on this trigger. With the trigger gone, new users got an
-- auth.users row but NO public.profiles row: 6 auth users existed, only 3
-- profiles. Signup was effectively half-broken.
--
-- The handle_new_user() function itself was intact and correct
-- (SECURITY DEFINER, inserts id + first_name/last_name from metadata +
-- default role 'sender'), so this only re-attaches the trigger and backfills
-- the profiles that were missed while it was absent.
-- ════════════════════════════════════════════════════════════════════

begin;

-- Re-attach the trigger the signup flow depends on.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing auth users that never got one.
insert into public.profiles (id, first_name, last_name, role)
select u.id,
       coalesce(u.raw_user_meta_data->>'first_name', ''),
       coalesce(u.raw_user_meta_data->>'last_name', ''),
       'sender'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

commit;
