// Server Action — TEMPORARY STUB for V1 demo.
// Pretends the carrier just verified their ID via Stripe Identity. Flips
// carrier_profiles.id_verification_status to 'verified'.
//
// ⚠️ REMOVE BEFORE GOING LIVE. Replace with the real Stripe Identity
// session-redirect flow described in docs/stripe-setup.md.

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function stubVerifyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Ensure carrier_profiles row exists.
  await supabase
    .from('carrier_profiles')
    .upsert({ id: user.id }, { onConflict: 'id' });

  const { error } = await supabase
    .from('carrier_profiles')
    .update({
      id_verification_status: 'verified',
      id_verified_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/profile');
  return { ok: true };
}
