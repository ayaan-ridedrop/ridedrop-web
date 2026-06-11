// ⚠️ DEPRECATED (v2) — DO NOT USE. compares plaintext PINs a carrier can read via the API; replaced by confirm_pickup/confirm_delivery RPCs.
// No longer imported anywhere. Kept for reference only.
// Server Action — carrier verifies the pickup or delivery PIN that the
// sender / recipient just read out to them. Confirms consent of handoff.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

const schema = z.object({
  bookingId: z.string().uuid(),
  kind: z.enum(['pickup', 'delivery']),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export async function verifyPin(formData: FormData) {
  const parsed = schema.safeParse({
    bookingId: formData.get('bookingId'),
    kind: formData.get('kind'),
    pin: formData.get('pin'),
  });
  if (!parsed.success) {
    const friendly = getFriendlyErrorMessage(parsed.error.errors[0]?.message ?? 'Invalid PIN');
    return { error: friendly.message, hint: friendly.hint };
  }

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You\'re not signed in.', action: 'Log in' };
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, carrier_id, pickup_pin, delivery_pin, paid_at')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) {
    const friendly = getFriendlyErrorMessage('booking not found');
    return { error: friendly.message, hint: friendly.hint };
  }
  if (booking.carrier_id !== user.id) {
    return { error: 'Only the delivery carrier can verify PINs.' };
  }

  // Pickup PIN requires payment to be made first. paid_at is set by the
  // Stripe webhook and is the only trustworthy "paid" signal —
  // stripe_payment_intent_id exists as soon as the payment form opens.
  if (parsed.data.kind === 'pickup' && !booking.paid_at) {
    return {
      error: 'Payment hasn\'t been made yet.',
      hint: 'Ask the sender to complete payment before pickup. You\'ll see a "Pay now" button in the booking.',
    };
  }

  const correctPin = parsed.data.kind === 'pickup' ? booking.pickup_pin : booking.delivery_pin;
  if (parsed.data.pin !== correctPin) {
    return {
      error: 'PIN doesn\'t match.',
      hint: 'Ask the sender to re-read the code. Check for typos — it\'s exactly 4 digits.',
    };
  }

  // State machine — pickup PIN advances accepted → picked_up. Delivery PIN
  // advances picked_up/in_transit → delivered. Photos can move state
  // independently (see upload-package-photo.ts).
  const update: Record<string, any> = {};
  if (parsed.data.kind === 'pickup') {
    if (!['accepted', 'picked_up'].includes(booking.status)) {
      return {
        error: `Can't pick up right now.`,
        hint: `Booking is ${booking.status}. It should be "accepted" or "picked up".`,
      };
    }
    update.status = 'picked_up';
  } else {
    if (!['picked_up', 'in_transit', 'delivered'].includes(booking.status)) {
      return {
        error: `Can't complete delivery right now.`,
        hint: `Booking is ${booking.status}. Pick it up first, then deliver.`,
      };
    }
    update.status = 'delivered';
    update.auto_release_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const { error: err } = await supabase.from('bookings').update(update).eq('id', booking.id);
  if (err) {
    const friendly = getFriendlyErrorMessage(err.message);
    return { error: friendly.message, hint: friendly.hint };
  }

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
