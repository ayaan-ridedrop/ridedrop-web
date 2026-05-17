// Server Action — either party can raise a dispute on an active booking.
// Freezes the booking status to 'disputed' so funds don't auto-release.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(3).max(80),
  description: z.string().max(1000).optional(),
});

export async function raiseDispute(formData: FormData) {
  const parsed = schema.safeParse({
    bookingId: formData.get('bookingId'),
    reason: formData.get('reason'),
    description: formData.get('description') ?? undefined,
  });
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, sender_id, carrier_id, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (![booking.sender_id, booking.carrier_id].includes(user.id)) {
    return { error: 'Not your booking' };
  }
  if (['completed', 'cancelled'].includes(booking.status)) {
    return { error: 'Booking is already closed' };
  }

  const { error: insertErr } = await supabase.from('disputes').insert({
    booking_id: booking.id,
    raised_by: user.id,
    reason: parsed.data.reason,
    description: parsed.data.description || null,
    status: 'open',
  });
  if (insertErr) return { error: insertErr.message };

  // Freeze the booking so funds don't auto-release while admin investigates.
  await supabase
    .from('bookings')
    .update({ status: 'disputed', auto_release_at: null })
    .eq('id', booking.id);

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
