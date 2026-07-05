'use server';

// src/lib/actions/carrier-refuse-pickup.ts
// Carrier declines a package at pickup (not as described / suspected
// prohibited item / damaged). Calls the carrier_refuse_pickup RPC — which
// opens a dispute and freezes the booking — then notifies both parties.
// Admin picks it up from the existing disputes queue.

import { createClient } from '@/lib/supabase/server';
import { emails } from '@/lib/email';
import { getUserEmail } from '@/lib/user-email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ridedrop.co.uk';

export async function carrierRefusePickup(
  bookingId: string,
  reason: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    return { error: 'Please add a bit more detail (10+ characters) so we can review it.' };
  }

  try {
    // 1. Open the dispute + freeze the booking (RPC enforces carrier-only +
    //    pickup-stage-only server-side).
    const { error: rpcErr } = await supabase.rpc('carrier_refuse_pickup', {
      p_booking_id: bookingId,
      p_reason: trimmed,
    });
    if (rpcErr) return { error: rpcErr.message };

    // 2. Notify both parties (best-effort; never block the refusal on email).
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, sender_id, carrier_id, job_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      const [{ data: job }, { data: sender }, { data: carrier }, senderEmail, carrierEmail] =
        await Promise.all([
          supabase.from('jobs').select('from_station, to_station').eq('id', booking.job_id).single(),
          supabase.from('profiles').select('first_name').eq('id', booking.sender_id).single(),
          supabase.from('profiles').select('first_name').eq('id', booking.carrier_id).single(),
          getUserEmail(booking.sender_id),
          getUserEmail(booking.carrier_id),
        ]);

      const route = job ? `${job.from_station} → ${job.to_station}` : 'your RideDrop delivery';
      const emailReason = `Carrier declined the package at pickup: ${trimmed}`;
      const jobs: Promise<unknown>[] = [];
      if (senderEmail) {
        jobs.push(emails.disputeRaised({
          to: senderEmail,
          name: sender?.first_name ?? 'there',
          route,
          reason: emailReason,
          bookingUrl: `${SITE}/bookings/${bookingId}`,
        }));
      }
      if (carrierEmail) {
        jobs.push(emails.disputeRaised({
          to: carrierEmail,
          name: carrier?.first_name ?? 'there',
          route,
          reason: emailReason,
          bookingUrl: `${SITE}/bookings/${bookingId}`,
        }));
      }
      await Promise.all(jobs).catch(() => {
        console.error('[carrier-refuse-pickup] email failed');
      });
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}
