// Server Action — after a completed booking, either party can leave a
// review of the other. The schema unique-constrains (booking_id, reviewer_id)
// so it's one review per side. A trigger recomputes the subject's
// average_rating.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(500).optional(),
});

export async function leaveReview(formData: FormData) {
  const parsed = schema.safeParse({
    bookingId: formData.get('bookingId'),
    rating: formData.get('rating'),
    body: formData.get('body') ?? undefined,
  });
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, sender_id, carrier_id, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (booking.status !== 'completed' && booking.status !== 'delivered') {
    return { error: 'You can only review a completed booking' };
  }
  if (booking.sender_id !== user.id && booking.carrier_id !== user.id) {
    return { error: 'You were not part of this booking' };
  }

  const subjectId =
    booking.sender_id === user.id ? booking.carrier_id : booking.sender_id;

  const { error } = await supabase.from('reviews').insert({
    booking_id: booking.id,
    reviewer_id: user.id,
    subject_id: subjectId,
    rating: parsed.data.rating,
    body: parsed.data.body || null,
  });

  if (error) {
    if (error.message.includes('duplicate')) {
      return { error: 'You already reviewed this booking' };
    }
    return { error: error.message };
  }

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true };
}
