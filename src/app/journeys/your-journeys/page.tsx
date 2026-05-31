// /journeys/your-journeys — carrier views and manages their own journeys
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CancelJourneyButton from './CancelJourneyButton';

export default async function YourJourneysPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: journeys } = await supabase
    .from('journeys')
    .select('id, from_station, to_station, departure_at, arrival_at, train_operator, minimum_price_pence, slots_remaining, status, created_at')
    .eq('carrier_id', user.id)
    .neq('status', 'cancelled')
    .order('departure_at', { ascending: true });

  const now = new Date();
  const listedJourneys = journeys?.filter((j: any) => j.status === 'listed' && new Date(j.departure_at) >= now) ?? [];
  const pendingJourneys = journeys?.filter((j: any) => j.status === 'ticket_pending' && new Date(j.departure_at) >= now) ?? [];
  const fullJourneys = journeys?.filter((j: any) => j.status === 'full' && new Date(j.departure_at) >= now) ?? [];
  const pastJourneys = journeys?.filter((j: any) => new Date(j.departure_at) < now) ?? [];

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Your journeys</h1>
      <p className="text-ink-soft mb-8 font-light">
        Train journeys you're offering. Cancel anytime before departure.
      </p>

      {/* LISTED JOURNEYS */}
      <div className="mb-10">
        <h2 className="text-2xl font-display font-bold mb-4">Listed ({listedJourneys.length})</h2>
        {listedJourneys.length === 0 ? (
          <p className="text-ink-soft mb-6">No listed journeys. <Link href="/journeys/new" className="text-accent underline">List a new one</Link>.</p>
        ) : (
          <ul className="space-y-3 mb-6">
            {listedJourneys.map((j: any) => (
              <li key={j.id}>
                <div className="bg-white border border-rail rounded-2xl p-5 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-display font-bold">
                      {j.from_station} → {j.to_station}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {new Date(j.departure_at).toLocaleString('en-GB')} · {j.train_operator}
                    </div>
                    <div className="text-xs text-ink-muted mt-1">
                      Slots: {j.slots_remaining} · Min price £{(j.minimum_price_pence / 100).toFixed(0)}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <CancelJourneyButton journeyId={j.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PENDING VERIFICATION */}
      {pendingJourneys.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-display font-bold mb-4">Pending Verification ({pendingJourneys.length})</h2>
          <ul className="space-y-3 mb-6">
            {pendingJourneys.map((j: any) => (
              <li key={j.id}>
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-display font-bold">
                      {j.from_station} → {j.to_station}
                    </div>
                    <div className="text-sm text-amber-900">
                      {new Date(j.departure_at).toLocaleString('en-GB')} · {j.train_operator}
                    </div>
                    <div className="text-xs text-amber-800 mt-1">
                      Ticket under review (2-4 hours typically)
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <CancelJourneyButton journeyId={j.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FULL JOURNEYS */}
      {fullJourneys.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-display font-bold mb-4">Full ({fullJourneys.length})</h2>
          <ul className="space-y-3 mb-6">
            {fullJourneys.map((j: any) => (
              <li key={j.id}>
                <div className="bg-white border border-rail rounded-2xl p-5 opacity-75">
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-soft">
                    {new Date(j.departure_at).toLocaleString('en-GB')} · {j.train_operator}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">All slots taken</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PAST JOURNEYS */}
      {pastJourneys.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold mb-4">Past ({pastJourneys.length})</h2>
          <ul className="space-y-3">
            {pastJourneys.map((j: any) => (
              <li key={j.id}>
                <div className="bg-white border border-rail rounded-2xl p-5 opacity-50">
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-soft">
                    {new Date(j.departure_at).toLocaleString('en-GB')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
