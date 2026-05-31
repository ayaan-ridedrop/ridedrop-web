// Server Action — carrier verifies the pickup or delivery PIN that the
// sender / recipient just read out to them. Confirms consent of handoff.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  bookingId: z.string().uuid(),
  kind: z.enum(['pickup', 'delivery']),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

export async function verifyPin(formData: FormData) {
  const parsed = schema.safeParse({
    bookingId: formData.get('bookingId'),
    kind: formData.get('kind'),
    pin: formData.get('pin'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, carrier_id, pickup_pin, delivery_pin')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (booking.carrier_id !== user.id) return { error: 'Only the carrier verifies PINs' };

  // Pickup PIN requires payment to be made first
  if (parsed.data.kind === 'pickup' && !booking.stripe_payment_intent_id) {
    return { error: 'Payment must be made before pickup. Ask the sender to pay.' };
  }

  const correctPin = parsed.data.kind === 'pickup' ? booking.pickup_pin : booking.delivery_pin;
  if (parsed.data.pin !== correctPin) {
    return { error: 'PIN does not match — ask the sender to re-read it' };
  }

  // State machine — pickup PIN advances accepted → picked_up. Delivery PIN
  // advances picked_up/in_transit → delivered. Photos can move state
  // independently (see upload-package-photo.ts).
  const update: Record<string, any> = {};
  if (parsed.data.kind === 'pickup') {
    if (!['accepted', 'picked_up'].includes(booking.status)) {
      return { error: `Cannot collect while booking is ${booking.status}` };
    }
    update.status = 'picked_up';
  } else {
    if (!['picked_up', 'in_transit', 'delivered'].includes(booking.status)) {
      return { error: `Cannot deliver while booking is ${booking.status}` };
    }
    update.status = 'delivered';
    update.auto_release_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const { error: err } = await supabase.from('bookings').update(update).eq('id', booking.id);
  if (err) return { error: err.message };

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
