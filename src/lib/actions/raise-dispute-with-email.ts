'use server';

// src/lib/actions/raise-dispute-with-email.ts
// Raises a dispute via RPC, then sends notification emails to both parties.

import { createClient } from '@/lib/supabase/server';
import { emails } from '@/lib/email';
import { getUserEmail } from '@/lib/user-email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ridedrop.co.uk';

export async function raiseDisputeWithEmail(
  bookingId: string,
  reason: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  try {
    // 1. Call the raise_dispute RPC
    const { error: rpcErr } = await supabase.rpc('raise_dispute', {
      p_booking_id: bookingId,
      p_reason: reason.trim(),
    });
    if (rpcErr) return { error: rpcErr.message };

    // 2. Fetch booking details for email
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, sender_id, carrier_id, status, job_id')
      .eq('id', bookingId)
      .single();

    if (!booking) return { error: 'Booking not found' };

    // 3. Fetch job + both parties' names & emails
    const [{ data: job }, { data: sender }, { data: carrier }, senderEmail, carrierEmail] =
      await Promise.all([
        supabase.from('jobs').select('from_station, to_station').eq('id', booking.job_id).single(),
        supabase.from('profiles').select('first_name').eq('id', booking.sender_id).single(),
        supabase.from('profiles').select('first_name').eq('id', booking.carrier_id).single(),
        getUserEmail(booking.sender_id),
        getUserEmail(booking.carrier_id),
      ]);

    if (!job) return { error: 'Job not found' };

    const route = `${job.from_station} → ${job.to_station}`;

    // 4. Send emails to both parties (fire-and-forget, don't block on failure)
    const emailPromises: Promise<unknown>[] = [];
    if (senderEmail) {
      emailPromises.push(
        emails.disputeRaised({
          to: senderEmail,
          name: sender?.first_name ?? 'there',
          route,
          reason,
          bookingUrl: `${SITE}/bookings/${bookingId}`,
        }),
      );
    }
    if (carrierEmail) {
      emailPromises.push(
        emails.disputeRaised({
          to: carrierEmail,
          name: carrier?.first_name ?? 'there',
          route,
          reason,
          bookingUrl: `${SITE}/bookings/${bookingId}`,
        }),
      );
    }
    await Promise.all(emailPromises).catch(() => {
      // Log but don't block — email is best-effort
      console.error('[raise-dispute] email failed');
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}
