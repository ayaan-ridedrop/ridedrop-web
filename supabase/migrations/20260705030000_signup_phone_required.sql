-- ════════════════════════════════════════════════════════════════════
-- RideDrop — Capture phone number at signup (stored, kept private)
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ APPLIED MANUALLY to production via the SQL editor on 2026-07-05.
--
-- Phone number is now a REQUIRED field on the signup form and is passed in
-- the auth signUp metadata (raw_user_meta_data->>'phone'). The profile row
-- is created by the handle_new_user trigger, so that function is extended to
-- also insert phone. It stays PRIVATE: the earlier PII lockdown revoked
-- SELECT on profiles.phone for anon/authenticated, so no other user can read
-- it — it's used only for the account/support.
--
-- (Ships with code changes to src/app/signup/SignupForm.tsx.)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    'sender'
  );
  return new;
exception when others then
  return new;
end;
$$;
