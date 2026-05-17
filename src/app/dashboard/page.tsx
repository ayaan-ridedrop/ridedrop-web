// /dashboard — landing for any logged-in user.
// Pulls the user's recent jobs, journeys, and bookings from Supabase.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import type { DashboardJob, DashboardJourney, DashboardBooking } from '@/lib/types';

export default async function DashboardPage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  // Last 5 of everything that matters.
  const [{ data: recentJobs }, { data: recentJourneys }, { data: activeBookings }] =
    await Promise.all<[
      { data: DashboardJob[] | null },
      { data: DashboardJourney[] | null },
      { data: DashboardBooking[] | null }
    ]>([
      supabase
        .from('jobs')
        .select('id, from_station, to_station, status, max_budget_pence, created_at')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      isCarrier
        ? supabase
            .from('journeys')
            .select('id, from_station, to_station, departure_at, status')
            .eq('carrier_id', user.id)
            .order('departure_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('bookings')
        .select('id, status, agreed_price_pence, job_id, journey_id')
        .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
        .in('status', ['accepted', 'picked_up', 'in_transit'])
        .limit(5),
    ]);

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-1">
        Hello{profile?.first_name ? `, ${profile.first_name}` : ''}.
      </h1>
      <p className="text-ink-soft mb-10 font-light">
        Here's what's happening on your account.
      </p>

      {/* QUICK ACTIONS */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <Link
          href="/send"
          className="bg-accent text-white rounded-2xl p-6 hover:scale-[1.01] transition"
        >
          <div className="font-display font-extrabold text-xl mb-1">
            Send something →
          </div>
          <div className="text-white/70 text-sm font-light">
            From £12 · Delivered in hours
          </div>
        </Link>
        {isCarrier ? (
          <Link
            href="/journeys/new"
            className="bg-ink text-white rounded-2xl p-6 hover:scale-[1.01] transition"
          >
            <div className="font-display font-extrabold text-xl mb-1">
              List a journey →
            </div>
            <div className="text-white/60 text-sm font-light">
              Earn from a trip you're already taking
            </div>
          </Link>
        ) : (
          <Link
            href="/profile"
            className="bg-white border border-rail rounded-2xl p-6 hover:border-ink transition"
          >
            <div className="font-display font-extrabold text-xl mb-1">
              Become a carrier →
            </div>
            <div className="text-ink-muted text-sm font-light">
              Add carrier mode and start earning
            </div>
          </Link>
        )}
      </div>

      {/* ACTIVE */}
      {activeBookings && activeBookings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl mb-4">Active deliveries</h2>
          <ul className="space-y-2">
            {activeBookings.map((b) => (
              <li
                key={b.id}
                className="bg-white border border-rail rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <span className="text-sm">Booking · {b.status}</span>
                <span className="font-display font-bold">
                  £{(b.agreed_price_pence / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* RECENT JOBS */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl">Your jobs</h2>
          <Link href="/send" className="text-sm text-accent underline">
            Post a new one →
          </Link>
        </div>
        {!recentJobs?.length ? (
          <p className="text-ink-muted text-sm font-light">
            No jobs yet. Post your first delivery.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentJobs.map((j) => (
              <li
                key={j.id}
                className="bg-white border border-rail rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-xs text-ink-muted uppercase tracking-wider">
                    {j.status}
                  </div>
                </div>
                <span className="font-display font-bold">
                  £{(j.max_budget_pence / 100).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* RECENT JOURNEYS (carriers only) */}
      {isCarrier && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Your journeys</h2>
            <Link href="/journeys/new" className="text-sm text-accent underline">
              List a new one →
            </Link>
          </div>
          {!recentJourneys?.length ? (
            <p className="text-ink-muted text-sm font-light">
              You haven't listed any journeys yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentJourneys.map((j) => (
                <li
                  key={j.id}
                  className="bg-white border border-rail rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {j.from_station} → {j.to_station}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {new Date(j.departure_at).toLocaleString('en-GB')} · {j.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </AppShell>
  );
}
