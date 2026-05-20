'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function cancelJourney(journeyId: string) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Fetch journey to verify ownership
  const { data: journey, error: fetchErr } = await supabase
    .from('journeys')
    .select('id, carrier_id, status')
    .eq('id', journeyId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!journey) throw new Error('Journey not found');
  if (journey.carrier_id !== user.id) throw new Error('Not your journey');
  if (journey.status === 'completed' || journey.status === 'cancelled') {
    throw new Error('Cannot cancel this journey');
  }

  // Mark as cancelled
  const { error: updateErr } = await supabase
    .from('journeys')
    .update({ status: 'cancelled' })
    .eq('id', journeyId);

  if (updateErr) throw new Error(updateErr.message);

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
