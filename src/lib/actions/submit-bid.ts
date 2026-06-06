'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

const schema = z.object({
  jobId: z.string().uuid(),
  journeyId: z.string().uuid(),
  amountPence: z.number().int().positive(),
});

export async function submitBid(formData: FormData) {
  const parsed = schema.safeParse({
    jobId: formData.get('jobId'),
    journeyId: formData.get('journeyId'),
    amountPence: parseInt(formData.get('amountPence') as string, 10),
  });

  if (!parsed.success) {
    const friendly = getFriendlyErrorMessage(parsed.error.errors[0]?.message ?? 'Invalid input');
    return { error: friendly.message, hint: friendly.hint };
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You\'re not signed in. Please log in to bid.', action: 'Log in' };
  }

  // Fetch the job to check it's still open
  const { data: job } = await supabase
    .from('jobs')
    .select('id, status')
    .eq('id', parsed.data.jobId)
    .maybeSingle();

  if (!job) {
    const friendly = getFriendlyErrorMessage('job not found');
    return { error: friendly.message, hint: friendly.hint };
  }
  if (job.status !== 'open') {
    const friendly = getFriendlyErrorMessage('job is no longer open');
    return { error: friendly.message, hint: friendly.hint };
  }

  // Verify the journey belongs to this carrier and is listed
  const { data: journey } = await supabase
    .from('journeys')
    .select('id, carrier_id, status')
    .eq('id', parsed.data.journeyId)
    .maybeSingle();

  if (!journey) {
    const friendly = getFriendlyErrorMessage('journey not found');
    return { error: friendly.message, hint: friendly.hint };
  }
  if (journey.carrier_id !== user.id) {
    const friendly = getFriendlyErrorMessage('this is not your journey');
    return { error: friendly.message, hint: friendly.hint };
  }
  if (journey.status !== 'listed' && journey.status !== 'in_progress') {
    const friendly = getFriendlyErrorMessage('this journey is not available');
    return { error: friendly.message, hint: friendly.hint };
  }

  // Insert or replace the bid
  const { error: err } = await supabase.from('bids').upsert({
    job_id: parsed.data.jobId,
    journey_id: parsed.data.journeyId,
    carrier_id: user.id,
    amount_pence: parsed.data.amountPence,
    status: 'pending',
  });

  if (err) {
    const friendly = getFriendlyErrorMessage(err.message);
    return { error: friendly.message, hint: friendly.hint };
  }

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}
