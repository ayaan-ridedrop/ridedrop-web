'use server';

// ⚠️ DEPRECATED (v2) — DO NOT USE. inserts a non-existent description column and is blocked by RLS; replaced by the raise_dispute RPC.
// No longer imported anywhere. Kept for reference only.

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(5).max(100),
  description: z.string().max(500).optional(),
});

export async function raiseDispute(formData: FormData) {
  const parsed = schema.safeParse({
    bookingId: formData.get('bookingId'),
    reason: formData.get('reason'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Verify user is part of this booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, sender_id, carrier_id, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (booking.sender_id !== user.id && booking.carrier_id !== user.id) {
    return { error: 'You are not part of this booking' };
  }
  if (booking.status !== 'delivered' && booking.status !== 'completed') {
    return { error: 'Can only dispute completed deliveries' };
  }

  // Check if dispute already exists
  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id')
    .eq('booking_id', parsed.data.bookingId)
    .eq('raised_by', user.id)
    .maybeSingle();

  if (existingDispute) {
    return { error: 'You have already raised a dispute on this booking' };
  }

  // Create dispute
  const { error: err } = await supabase
    .from('disputes')
    .insert({
      booking_id: parsed.data.bookingId,
      raised_by: user.id,
      reason: parsed.data.reason,
      description: parsed.data.description,
      status: 'open',
    });

  if (err) return { error: err.message };

  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}
