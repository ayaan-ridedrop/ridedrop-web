import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function EarningsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if carrier
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';
  if (!isCarrier) {
    return (
      <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted mb-4">You need to enable carrier mode to view earnings.</p>
          <Link href="/profile" className="text-accent underline font-medium">
            Update profile →
          </Link>
        </div>
      </AppShell>
    );
  }

  // Fetch completed bookings for this carrier
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, agreed_price_pence, commission_pence, status, created_at, job_id')
    .eq('carrier_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Fetch job details for display
  const jobIds = bookings?.map((b: any) => b.job_id) ?? [];
  let jobMap: Record<string, any> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, from_station, to_station')
      .in('id', jobIds);
    jobMap = Object.fromEntries((jobs ?? []).map((j: any) => [j.id, j]));
  }

  // Calculate totals
  const totalEarned = bookings?.reduce((sum: number, b: any) => sum + (b.agreed_price_pence - b.commission_pence), 0) ?? 0;
  const totalCommission = bookings?.reduce((sum: number, b: any) => sum + b.commission_pence, 0) ?? 0;
  const completedDeliveries = bookings?.length ?? 0;

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-display font-bold mb-2">Earnings</h1>
        <p className="text-ink-soft mb-10">
          Your delivery earnings and RideDrop commission breakdown.
        </p>

        {/* SUMMARY CARDS */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-rail rounded-2xl p-6">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
              You've Earned
            </div>
            <div className="font-display font-extrabold text-3xl text-accent mb-1">
              £{(totalEarned / 100).toFixed(2)}
            </div>
            <div className="text-xs text-ink-soft">
              From {completedDeliveries} delivery{completedDeliveries === 1 ? '' : 'ies'}
            </div>
          </div>

          <div className="bg-white border border-rail rounded-2xl p-6">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
              RideDrop Commission
            </div>
            <div className="font-display font-extrabold text-3xl text-ink mb-1">
              £{(totalCommission / 100).toFixed(2)}
            </div>
            <div className="text-xs text-ink-soft">
              20% of all deliveries
            </div>
          </div>

          <div className="bg-white border border-rail rounded-2xl p-6">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
              Total Charged
            </div>
            <div className="font-display font-extrabold text-3xl text-ink-soft mb-1">
              £{((totalEarned + totalCommission) / 100).toFixed(2)}
            </div>
            <div className="text-xs text-ink-soft">
              {completedDeliveries} delivery{completedDeliveries === 1 ? '' : 'ies'}
            </div>
          </div>
        </div>

        {/* PER-DELIVERY BREAKDOWN */}
        {completedDeliveries > 0 ? (
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Delivery breakdown</h2>
            <div className="space-y-2">
              <div className="bg-white border border-rail rounded-2xl p-4 grid grid-cols-4 gap-3 text-xs font-medium text-ink-muted uppercase tracking-wider">
                <div>Route</div>
                <div className="text-right">Charged</div>
                <div className="text-right">Commission (20%)</div>
                <div className="text-right">You Keep</div>
              </div>

              {bookings?.map((booking: any) => {
                const job = jobMap[booking.job_id];
                const youKeep = booking.agreed_price_pence - booking.commission_pence;
                return (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="bg-white border border-rail rounded-2xl p-4 grid grid-cols-4 gap-3 hover:border-accent transition items-center"
                  >
                    <div className="text-sm font-medium">
                      {job ? `${job.from_station} → ${job.to_station}` : 'Unknown route'}
                    </div>
                    <div className="text-right font-display font-bold">
                      £{(booking.agreed_price_pence / 100).toFixed(2)}
                    </div>
                    <div className="text-right text-ink-soft">
                      -£{(booking.commission_pence / 100).toFixed(2)}
                    </div>
                    <div className="text-right font-display font-bold text-accent">
                      £{(youKeep / 100).toFixed(2)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
            <p className="text-ink-muted mb-4">No completed deliveries yet.</p>
            <Link href="/jobs/browse" className="text-accent underline font-medium">
              Browse available jobs →
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
