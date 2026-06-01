'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Fetch the job to check it's still open and verify max_budget
  const { data: job } = await supabase
    .from('jobs')
    .select('id, max_budget_pence, status')
    .eq('id', parsed.data.jobId)
    .maybeSingle();

  if (!job) return { error: 'Job not found' };
  if (job.status !== 'open') return { error: 'Job is no longer open' };
  if (parsed.data.amountPence > job.max_budget_pence) {
    return { error: `Bid exceeds max budget of £${(job.max_budget_pence / 100).toFixed(2)}` };
  }

  // Verify the journey belongs to this carrier and is listed
  const { data: journey } = await supabase
    .from('journeys')
    .select('id, carrier_id, status')
    .eq('id', parsed.data.journeyId)
    .maybeSingle();

  if (!journey) return { error: 'Journey not found' };
  if (journey.carrier_id !== user.id) return { error: 'This is not your journey' };
  if (journey.status !== 'listed' && journey.status !== 'in_progress') {
    return { error: 'This journey is not available' };
  }

  // Insert or replace the bid
  const { error: err } = await supabase.from('bids').upsert({
    job_id: parsed.data.jobId,
    journey_id: parsed.data.journeyId,
    carrier_id: user.id,
    amount_pence: parsed.data.amountPence,
    status: 'pending',
  });

  if (err) return { error: err.message };

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}
