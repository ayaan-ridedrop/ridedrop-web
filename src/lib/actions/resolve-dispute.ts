// Server Action — admin resolves a dispute. Updates the booking + dispute
// rows accordingly. Refunds via Stripe would happen here in production;
// for V1 we just record the decision.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

const schema = z.object({
  disputeId: z.string().uuid(),
  bookingId: z.string().uuid(),
  resolution: z.enum(['refund_sender', 'pay_carrier', 'split']),
  notes: z.string().max(1000).optional(),
});

export async function resolveDispute(formData: FormData) {
  const parsed = schema.safeParse({
    disputeId: formData.get('disputeId'),
    bookingId: formData.get('bookingId'),
    resolution: formData.get('resolution'),
    notes: formData.get('notes') ?? undefined,
  });
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { error: 'Forbidden' };

  // Service-role to cross RLS on the booking.
  const admin = createServiceClient();

  const { error: dErr } = await admin
    .from('disputes')
    .update({
      status: 'resolved',
      resolution_notes:
        `Resolution: ${parsed.data.resolution}` +
        (parsed.data.notes ? `\n${parsed.data.notes}` : ''),
      resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.disputeId);
  if (dErr) return { error: dErr.message };

  // For pay_carrier: complete the booking (carrier stats bump via trigger).
  // For refund_sender: cancel the booking.
  // For split: cancel the booking and rely on manual Stripe refund.
  const newStatus =
    parsed.data.resolution === 'pay_carrier' ? 'completed' : 'cancelled';
  const { error: bErr } = await admin
    .from('bookings')
    .update({
      status: newStatus,
      funds_released_at:
        parsed.data.resolution === 'pay_carrier'
          ? new Date().toISOString()
          : null,
    })
    .eq('id', parsed.data.bookingId);
  if (bErr) return { error: bErr.message };

  // TODO when Stripe is live: trigger the actual refund / transfer here.

  revalidatePath('/admin');
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}
