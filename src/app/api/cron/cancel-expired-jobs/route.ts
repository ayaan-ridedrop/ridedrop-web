import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Verify it's from Netlify Cron or internal call
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient() as any;

  try {
    // Cancel all open jobs past their deadline
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('status', 'open')
      .lt('must_arrive_by', new Date().toISOString());

    if (error) throw error;

    return Response.json({ success: true, message: 'Expired jobs cancelled' });
  } catch (err: any) {
    console.error('[cron] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
