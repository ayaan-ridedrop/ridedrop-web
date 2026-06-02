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

    return Response.json({ success: true, message: 'Expired jobs and journeys cancelled' });
  } catch (err: any) {
    console.error('[cron] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
