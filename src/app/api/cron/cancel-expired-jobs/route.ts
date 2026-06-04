import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Verify it's from Netlify Cron or internal call
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient() as any;

  try {
    const now = new Date().toISOString();

    // Cancel all open jobs past their deadline
    const { error: jobsErr } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('status', 'open')
      .lt('must_arrive_by', now);

    if (jobsErr) throw jobsErr;

    // Also cancel journeys that have already departed
    const { error: journeysErr } = await supabase
      .from('journeys')
      .update({ status: 'cancelled' })
      .in('status', ['draft', 'listed'])
      .lt('departure_at', now);

    if (journeysErr) throw journeysErr;

    // Mark jobs as 'completed' if their booking is completed
    const { error: jobCompleteErr } = await supabase.rpc('complete_matched_jobs');
    if (jobCompleteErr) console.warn('[cron] job completion warning:', jobCompleteErr);

    // Cleanup orphaned matched jobs (matched with no active booking)
    const { error: cleanupErr } = await supabase.rpc('cleanup_orphaned_jobs');
    if (cleanupErr) console.warn('[cron] cleanup warning:', cleanupErr);

    return Response.json({ success: true, message: 'Expired jobs cancelled, matched jobs completed, orphaned jobs cleaned' });
  } catch (err: any) {
    console.error('[cron] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
