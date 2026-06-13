// Get a user's email address.
//
// WHY THIS EXISTS: email lives in `auth.users`, NOT in `public.profiles`.
// Several places used to do `profiles.select('email, ...')`, which silently
// failed (no such column) — so carrier/sender notification emails never sent.
// This fetches the email correctly via the service-role admin API.
//
// Server-only: uses the service-role client. Never import into a client component.

import { createServiceClient } from '@/lib/supabase/server';

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = createServiceClient() as any;
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) return null;
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
