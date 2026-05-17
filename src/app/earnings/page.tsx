// /earnings — carrier view of total earnings + recent payouts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function EarningsPage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  const { data: cp } = isCarrier
    ? await supabase
        .from('carrier_profiles')
        .select('total_deliveries, total_earnings_pence, average_rating, payout_enabled')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  // Recent completed bookings (paid out) and active ones (in escrow).
  const { data: completed } = await supabase
    .from('bookings')
    .select(`
      id, agreed_price_pence, commission_pence, funds_released_at,
      jobs!inner(from_station, to_station)
    `)
    .eq('carrier_id', user.id)
    .eq('status', 'completed')
    .order('funds_released_at', { ascending: false })
    .limit(20);

  const { data: pending } = await supabase
    .from('bookings')
    .select(`
      id, status, agreed_price_pence, commission_pence,
      jobs!inner(from_station, to_station)
    `)
    .eq('carrier_id', user.id)
    .in('status', ['accepted', 'picked_up', 'in_transit', 'delivered']);

  const totalEarned = (cp?.total_earnings_pence ?? 0) / 100;
  const inEscrow =
    (pending ?? []).reduce(
      (sum: number, b: any) => sum + (b.agreed_price_pence - b.commission_pence),
      0,
    ) / 100;

  const last4w = (completed ?? [])
    .filter((b: any) => {
      if (!b.funds_released_at) return false;
      const days =
        (Date.now() - new Date(b.funds_released_at).getTime()) / (1000 * 60 * 60 * 24);
      return days < 28;
    })
    .reduce(
      (sum: number, b: any) => sum + (b.agreed_price_pence - b.commission_pence),
      0,
    ) / 100;

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Earnings</h1>
      <p className="text-ink-soft mb-8 font-light">
        Money you've made carrying for RideDrop.
      </p>

      {!isCarrier ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-900">
          You're on a sender-only account. Switch on carrier mode in{' '}
          <Link href="/profile" className="underline font-medium">
            your profile
          </Link>{' '}
          to start earning.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <Stat
              label="Lifetime"
              value={`£${totalEarned.toFixed(2)}`}
              hint="after commission"
              big
            />
            <Stat
              label="Last 4 weeks"
              value={`£${last4w.toFixed(2)}`}
              hint="paid out"
            />
            <Stat
              label="In escrow"
              value={`£${inEscrow.toFixed(2)}`}
              hint="awaiting release"
            />
            <Stat
              label="Deliveries"
              value={String(cp?.total_deliveries ?? 0)}
              hint={
                cp?.average_rating
                  ? `${cp.average_rating.toFixed(1)}★ average`
                  : 'no reviews yet'
              }
            />
          </div>

          {!cp?.payout_enabled && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-10 text-sm text-amber-900">
              You haven't connected a payout method yet. Once Stripe Connect
              is approved, you'll be able to link a bank account from your
              profile to receive payouts.
            </div>
          )}

          <h2 className="text-2xl mb-4">Recent payouts</h2>
          {!completed?.length ? (
            <p className="text-ink-muted text-sm font-light">
              You haven't completed any deliveries yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {completed.map((b: any) => {
                const net = (b.agreed_price_pence - b.commission_pence) / 100;
                return (
                  <li key={b.id}>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="bg-white border border-rail rounded-2xl p-4 flex items-center justify-between hover:border-ink transition"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {b.jobs.from_station} → {b.jobs.to_station}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">
                          {b.funds_released_at
                            ? new Date(b.funds_released_at).toLocaleDateString('en-GB')
                            : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-accent">
                          £{net.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-ink-muted">paid out</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-rail rounded-2xl p-5 ${
        big ? 'md:col-span-1' : ''
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-2">
        {label}
      </div>
      <div
        className={`font-display font-extrabold ${big ? 'text-3xl text-accent' : 'text-2xl'}`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </div>
  );
}
