import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request: Request) {
  const supabase = createClient() as any;

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const { journeyId, action, notes } = body;

  if (!journeyId || !action) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Use service role key to bypass RLS for admin operations
  const adminSupabase = createServiceClient() as any;

  if (action === 'approve') {
    // Update journey status to 'listed' and set ticket_verified_at
    const { error } = await adminSupabase
      .from('journeys')
      .update({
        status: 'listed',
        ticket_verified_at: new Date().toISOString(),
      })
      .eq('id', journeyId);

    if (error) {
      console.error('Error approving ticket:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to approve ticket' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Ticket approved' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } else if (action === 'reject') {
    // Update journey status to 'ticket_rejected' and add rejection notes
    const { error } = await adminSupabase
      .from('journeys')
      .update({
        status: 'ticket_rejected',
        notes,
      })
      .eq('id', journeyId);

    if (error) {
      console.error('Error rejecting ticket:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to reject ticket' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send email to carrier notifying them of the rejection and asking them to reupload

    return new Response(
      JSON.stringify({ success: true, message: 'Ticket rejected' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
