'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

const schema = z.object({
  bidId: z.string().uuid(),
});

export async function acceptBid(formData: FormData) {
  const parsed = schema.safeParse({
    bidId: formData.get('bidId'),
  });

  if (!parsed.success) {
    const friendly = getFriendlyErrorMessage(parsed.error.errors[0]?.message ?? 'Invalid input');
    return { error: friendly.message, hint: friendly.hint };
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You\'re not signed in. Please log in.', action: 'Log in' };
  }

  // Fetch the bid
  const { data: bid } = await supabase
    .from('bids')
    .select('id, job_id, journey_id, carrier_id, amount_pence')
    .eq('id', parsed.data.bidId)
    .maybeSingle();

  if (!bid) {
    const friendly = getFriendlyErrorMessage('bid not found');
    return { error: friendly.message, hint: friendly.hint };
  }

  // Fetch the job to verify sender and journey
  const { data: job } = await supabase
    .from('jobs')
    .select('id, sender_id, status')
    .eq('id', bid.job_id)
    .maybeSingle();

  if (!job) {
    const friendly = getFriendlyErrorMessage('job not found');
    return { error: friendly.message, hint: friendly.hint };
  }
  if (job.sender_id !== user.id) {
    return { error: 'Only the job poster can accept bids.' };
  }
  if (job.status !== 'open') {
    const friendly = getFriendlyErrorMessage('job is no longer open');
    return { error: friendly.message, hint: friendly.hint };
  }

  // Create a booking with the accepted bid amount + journey
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      job_id: bid.job_id,
      journey_id: bid.journey_id,
      sender_id: job.sender_id,
      carrier_id: bid.carrier_id,
      agreed_price_pence: bid.amount_pence,
      commission_pence: Math.round(bid.amount_pence * 0.2), // 20% commission
      status: 'accepted',
    })
    .select();

  if (bookingErr) {
    const friendly = getFriendlyErrorMessage(bookingErr.message);
    return { error: friendly.message, hint: friendly.hint };
  }

  // Mark this bid as accepted, others as rejected
  await supabase
    .from('bids')
    .update({ status: 'accepted' })
    .eq('id', parsed.data.bidId);

  await supabase
    .from('bids')
    .update({ status: 'rejected' })
    .eq('job_id', bid.job_id)
    .neq('id', parsed.data.bidId);

  revalidatePath(`/jobs/${bid.job_id}`);
  revalidatePath('/bookings');
  return { ok: true, bookingId: booking?.[0]?.id };
}
