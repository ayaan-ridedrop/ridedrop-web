// Server Action — sender confirms delivery, releasing the booking to
// 'completed' state. Triggers carrier stats bump and (eventually) Stripe
// payout. Idempotent.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      funds_released_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
