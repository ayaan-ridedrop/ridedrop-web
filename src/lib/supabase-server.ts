// src/lib/supabase-server.ts
// Helper for API routes: returns the signed-in user (or null).
// Wraps the cookie-based server client from '@/lib/supabase/server'.

import { createClient } from '@/lib/supabase/server';

export async function getServerUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
