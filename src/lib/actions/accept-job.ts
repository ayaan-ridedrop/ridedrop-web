// Server Action — a carrier accepts an open job.
// This is the missing link in the marketplace: until a booking row exists,
// nothing actually happens. This function inserts that row and atomically
// flips the job from 'open' → 'matched'.

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { RIDEDROP_COMMISSION, type Profile } from '@/lib/types';
import { emails } from '@/lib/email';

const schema = z.object({
  jobId: z.string().uuid(),
  journeyId: z.string().uuid(),
  agreedPriceGbp: z.coerce.number().min(5).max(500),
});

export async function acceptJob(formData: FormData) {
  const parsed = schema.safeParse({
    jobId: formData.get('jobId'),
    journeyId: formData.get('journeyId'),
    agreedPriceGbp: formData.get('agreedPriceGbp'),
  });
  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Pull job and journey to validate before inserting.
  const [{ data: job }, { data: journey }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, sender_id, status, max_budget_pence, from_station, to_station')
      .eq('id', parsed.data.jobId)
      .maybeSingle(),
    supabase
      .from('journeys')
      .select('id, carrier_id, status, slots_remaining, minimum_price_pence, from_station, to_station')
      .eq('id', parsed.data.journeyId)
      .maybeSingle(),
  ]);

  if (!job) return { error: 'Job not found' };
  if (!journey) return { error: 'Journey not found' };
  if (job.status !== 'open') return { error: 'Job is no longer open' };
  if (journey.carrier_id !== user.id) return { error: 'That journey is not yours' };
  if (journey.status !== 'listed') return { error: 'Journey is not live yet' };
  if (journey.slots_remaining < 1) return { error: 'Journey has no slots left' };
  if (journey.from_station !== job.from_station || journey.to_station !== job.to_station) {
    return { error: 'Routes do not match' };
  }

  const agreedPricePence = Math.round(parsed.data.agreedPriceGbp * 100);
  if (agreedPricePence < journey.minimum_price_pence) {
    return { error: `Your minimum is £${(journey.minimum_price_pence / 100).toFixed(2)}` };
  }
  if (agreedPricePence > job.max_budget_pence) {
    return { error: `Sender's max is £${(job.max_budget_pence / 100).toFixed(2)}` };
  }

  const commissionPence = Math.round(agreedPricePence * RIDEDROP_COMMISSION);

  // Insert the booking and update the job in two writes.
  // (A Postgres trigger handles slot decrement + journey 'full' status.)
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      job_id: job.id,
      journey_id: journey.id,
      sender_id: job.sender_id,
      carrier_id: user.id,
      agreed_price_pence: agreedPricePence,
      commission_pence: commissionPence,
      status: 'accepted',
    })
    .select('id')
    .single();

  if (bookingErr || !booking) {
    return { error: bookingErr?.message ?? 'Could not create booking' };
  }

  // A Postgres trigger (tg_booking_acceptance) runs with security definer
  // and atomically flips the job to 'matched' and decrements journey slots.
  // See supabase/schema.sql.

  // Email the sender that someone just accepted their job.
  // auth.admin requires service-role; fire-and-forget so a missing
  // Resend key never blocks the booking.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const admin = createServiceClient();
    const [{ data: senderAuth }, { data: senderProfile }, { data: carrierProfile }] =
      await Promise.all([
        admin.auth.admin.getUserById(job.sender_id),
        admin.from('profiles').select('first_name').eq('id', job.sender_id).maybeSingle().then(r => r) as Promise<{ data: Pick<Profile, 'first_name'> | null }>,
        admin.from('profiles').select('first_name').eq('id', user.id).maybeSingle().then(r => r) as Promise<{ data: Pick<Profile, 'first_name'> | null }>,
      ]);
    if (senderAuth?.user?.email) {
      await emails.bookingAccepted({
        to: senderAuth.user.email,
        senderName: senderProfile?.first_name ?? 'there',
        carrierName: carrierProfile?.first_name ?? 'A carrier',
        route: `${job.from_station} → ${job.to_station}`,
        priceGbp: agreedPricePence / 100,
        bookingUrl: `${baseUrl}/bookings/${booking.id}`,
      });
    }
  } catch (err) {
    console.error('[accept-job] email failed:', err);
  }

  revalidatePath('/jobs/browse');
  revalidatePath('/dashboard');
  redirect(`/bookings/${booking.id}`);
}
