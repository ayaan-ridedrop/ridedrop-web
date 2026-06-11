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

export async function resolveDispute(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    disputeId: formData.get('disputeId'),
    bookingId: formData.get('bookingId'),
    resolution: formData.get('resolution'),
    notes: formData.get('notes') ?? undefined,
  });
  if (!parsed.success) throw new Error('Invalid input');

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error('Forbidden');

  // Service-role to cross RLS on the booking.
  const admin = createServiceClient();

  // disputes.status only allows 'open' | 'released' | 'refunded' (DB check
  // constraint) and the column is resolution_note (singular).
  // pay_carrier → 'released'; refund_sender / split → 'refunded' (split
  // detail goes in the note; partial refunds are manual in Stripe for now).
  const disputeStatus =
    parsed.data.resolution === 'pay_carrier' ? 'released' : 'refunded';
  const { error: dErr } = await (admin
    .from('disputes') as any)
    .update({
      status: disputeStatus,
      resolution_note:
        `Resolution: ${parsed.data.resolution}` +
        (parsed.data.notes ? `\n${parsed.data.notes}` : ''),
      resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.disputeId);
  if (dErr) throw new Error(dErr.message);

  // pay_carrier → booking completed; the payout function moves the money
  // (do NOT set funds_released_at here — see confirm-delivery.ts).
  // refund_sender / split → booking cancelled; refund manually in Stripe.
  const newStatus =
    parsed.data.resolution === 'pay_carrier' ? 'completed' : 'cancelled';
  const { error: bErr } = await (admin
    .from('bookings') as any)
    .update({
      status: newStatus,
    })
    .eq('id', parsed.data.bookingId);
  if (bErr) throw new Error(bErr.message);

  // TODO when Stripe is live: trigger the actual refund / transfer here.

  revalidatePath('/admin');
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
}
