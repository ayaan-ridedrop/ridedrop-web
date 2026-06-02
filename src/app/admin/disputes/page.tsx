import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ResolveDisputeForm from './ResolveDisputeForm';

export default async function DisputesAdminPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // TODO: Add proper admin role check
  // For now, just allow the founder to access
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch all disputes
  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, booking_id, raised_by, reason, description, status, created_at, resolution_notes')
    .order('created_at', { ascending: false });

  // Fetch booking and user details
  const bookingIds = [...new Set((disputes ?? []).map((d: any) => d.booking_id))];
  const userIds = [...new Set((disputes ?? []).map((d: any) => d.raised_by))];

  let bookingMap: Record<string, any> = {};
  let userMap: Record<string, any> = {};

  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, job_id, sender_id, carrier_id, agreed_price_pence')
      .in('id', bookingIds);
    bookingMap = Object.fromEntries((bookings ?? []).map((b: any) => [b.id, b]));

    // Get job details
    const jobIds = [...new Set((bookings ?? []).map((b: any) => b.job_id))];
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, from_station, to_station');
      const jobMap = Object.fromEntries((jobs ?? []).map((j: any) => [j.id, j]));
      (bookings ?? []).forEach((b: any) => {
        bookingMap[b.id].job = jobMap[b.job_id];
      });
    }
  }

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    userMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]));
  }

  // Filter by status
  const openDisputes = disputes?.filter((d: any) => ['open', 'reviewing'].includes(d.status)) ?? [];
  const resolvedDisputes = disputes?.filter((d: any) => ['resolved', 'rejected'].includes(d.status)) ?? [];

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl font-display font-bold mb-2">Disputes</h1>
      <p className="text-ink-soft mb-10">
        Review and resolve customer disputes.
      </p>

      {openDisputes.length === 0 && resolvedDisputes.length === 0 ? (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted">No disputes yet. Platform is running smoothly!</p>
        </div>
      ) : (
        <>
          {/* OPEN DISPUTES */}
          {openDisputes.length > 0 && (
            <section className="mb-10">
              <h2 className="text-2xl font-display font-bold mb-4">
                Open ({openDisputes.length})
              </h2>
              <div className="space-y-4">
                {openDisputes.map((dispute: any) => {
                  const booking = bookingMap[dispute.booking_id];
                  const raiser = userMap[dispute.raised_by];
                  return (
                    <div
                      key={dispute.id}
                      className="bg-white border border-red-300 rounded-2xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-display font-bold text-lg mb-1">
                            {booking?.job?.from_station} → {booking?.job?.to_station}
                          </div>
                          <div className="text-sm text-ink-soft mb-2">
                            Raised by {raiser?.first_name || 'User'} · {new Date(dispute.created_at).toLocaleString('en-GB')}
                          </div>
                          <div className="text-sm font-medium mb-2">
                            Reason: <span className="text-ink">{dispute.reason}</span>
                          </div>
                          {dispute.description && (
                            <div className="text-sm text-ink-soft bg-gray-50 rounded-lg p-3 mb-4">
                              {dispute.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-display font-bold text-xl text-red-600 mb-3">
                            £{(booking?.agreed_price_pence / 100).toFixed(2)}
                          </div>
                          <Link
                            href={`/bookings/${dispute.booking_id}`}
                            className="text-xs text-accent underline"
                          >
                            View booking →
                          </Link>
                        </div>
                      </div>

                      {/* RESOLVE FORM */}
                      <ResolveDisputeForm disputeId={dispute.id} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* RESOLVED DISPUTES */}
          {resolvedDisputes.length > 0 && (
            <section>
              <h2 className="text-2xl font-display font-bold mb-4">
                Resolved ({resolvedDisputes.length})
              </h2>
              <div className="space-y-3">
                {resolvedDisputes.map((dispute: any) => {
                  const booking = bookingMap[dispute.booking_id];
                  const raiser = userMap[dispute.raised_by];
                  return (
                    <div
                      key={dispute.id}
                      className="bg-white border border-rail rounded-xl p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {booking?.job?.from_station} → {booking?.job?.to_station} · {dispute.reason}
                          </div>
                          <div className="text-xs text-ink-soft">
                            {raiser?.first_name} · {dispute.status}
                          </div>
                        </div>
                        <div className="text-xs text-ink-soft">
                          {dispute.resolution_notes && `"${dispute.resolution_notes}"`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
