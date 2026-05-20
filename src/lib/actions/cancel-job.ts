'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function cancelJob(jobId: string) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Fetch job to verify ownership
  const { data: job, error: fetchErr } = await supabase
    .from('jobs')
    .select('id, sender_id, status')
    .eq('id', jobId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!job) throw new Error('Job not found');
  if (job.sender_id !== user.id) throw new Error('Not your job');
  if (job.status === 'matched' || job.status === 'completed' || job.status === 'cancelled') {
    throw new Error('Cannot cancel this job');
  }

  // Mark as cancelled
  const { error: updateErr } = await supabase
    .from('jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId);

  if (updateErr) throw new Error(updateErr.message);

  revalidatePath('/dashboard');
  revalidatePath('/send');
  redirect('/dashboard');
}
