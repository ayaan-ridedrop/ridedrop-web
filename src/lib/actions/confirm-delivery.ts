// Server Action — sender confirms delivery, releasing the booking to
// 'completed' state. Triggers carrier stats bump and (eventually) Stripe
// payout. Idempotent.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const schema = z.object({
  bookingId: z.string().uuid(),
});

export async function confirmDelivery(formData: FormData) {
  const parsed = schema.safeParse({ bookingId: formData.get('bookingId') });
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, sender_id, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (booking.sender_id !== user.id) return { error: 'Only the sender confirms' };
  if (booking.status !== 'delivered') {
    return { error: `Cannot confirm while booking is ${booking.status}` };
  }

  // NOTE: this does NOT set funds_released_at. Only the payout (release)
  // function may set that, at the moment money actually moves via Stripe.
  // Marking it here would make the payout function skip this booking and
  // the carrier would never be paid.
  //
  // SECURITY: written via the service-role client. Clients no longer have
  // UPDATE on bookings (see migration 20260613000000_security_phase1.sql),
  // so this trusted write must bypass the anon role. The auth checks above
  // (sender owns booking, status === 'delivered') are what authorise it.
  const admin = createServiceClient() as any;
  const { error } = await admin
    .from('bookings')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
    .eq('sender_id', user.id)        // belt-and-braces: re-assert ownership
    .eq('status', 'delivered');      // and the required precondition

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
