// /dashboard — landing for logged-in users.
// Shows: active bookings + recent matched jobs/journeys (last 48h only)

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function DashboardPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  // Get 48h cutoff
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Fetch active bookings with journey info
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, agreed_price_pence, created_at, journey_id')
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .in('status', ['accepted', 'picked_up', 'in_transit', 'delivered'])
    .order('created_at', { ascending: false });

  // Fetch journeys to check departure times
  const { data: allJourneys } = await supabase
    .from('journeys')
    .select('id, departure_at');

  const journeyMap = new Map(allJourneys?.map((j: any) => [j.id, j]) ?? []);

  // Fetch recent matched jobs (last 48h, exclude cancelled/expired)
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('id, from_station, to_station, status, created_at')
    .eq('sender_id', user.id)
    .eq('status', 'matched')
    .gte('created_at', fortyEightHoursAgo)
    .gt('must_arrive_by', new Date().toISOString())
    .order('created_at', { ascending: false });

  // Fetch recent journeys (last 48h, carriers only)
  const recentJourneys = isCarrier
    ? (
        await supabase
          .from('journeys')
          .select('id, from_station, to_station, departure_at, status, created_at')
          .eq('carrier_id', user.id)
          .neq('status', 'cancelled')
          .gte('created_at', fortyEightHoursAgo)
          .order('departure_at', { ascending: false })
      ).data
    : [];

  // Combine active items (filter out old bookings where journey has departed)
  const activeItems = [
    ...(bookings
      ?.filter((b: any) => {
        const journey = journeyMap.get(b.journey_id) as any;
        if (!journey) return true; // Keep if no journey found
        return new Date(journey.departure_at) >= new Date(); // Keep only if journey hasn't departed
      })
      .map((b: any) => ({
        type: 'booking',
        id: b.id,
        title: `Booking · ${b.status}`,
        price: b.agreed_price_pence / 100,
        createdAt: b.created_at,
      })) ?? []),
    ...(recentJobs?.map((j: any) => ({
      type: 'job',
      id: j.id,
      title: `${j.from_station} → ${j.to_station} (matched)`,
      price: j.max_budget_pence / 100,
      createdAt: j.created_at,
    })) ?? []),
    ...(recentJourneys?.map((j: any) => ({
      type: 'journey',
      id: j.id,
      title: `${j.from_station} → ${j.to_station}`,
      price: null,
      createdAt: j.created_at,
    })) ?? []),
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

      {/* ACTIVE SECTION (consolidated) */}
      {activeItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl mb-4">Active</h2>
          <ul className="space-y-2">
            {activeItems.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="bg-white border border-rail rounded-xl px-5 py-4 flex items-center justify-between hover:border-accent transition"
              >
                <Link
                  href={
                    item.type === 'booking'
                      ? `/bookings/${item.id}`
                      : item.type === 'job'
                        ? `/jobs/your-jobs`
                        : `/journeys/your-journeys`
                  }
                  className="flex-1 text-sm hover:text-accent"
                >
                  {item.title}
                </Link>
                {item.price !== null && (
                  <span className="font-display font-bold ml-4">
                    £{item.price.toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeItems.length === 0 && (
        <section className="mb-10">
          <p className="text-ink-soft text-sm font-light">
            No active deliveries. {!isCarrier ? 'Post a job' : 'Accept a job'} to get started.
          </p>
        </section>
      )}

      {/* FULL ACTIVITY LINK */}
      <section className="space-y-2 text-sm">
        <Link href="/activity" className="block text-accent hover:underline font-medium">
          → View all activity (bookings, jobs, journeys)
        </Link>
      </section>
    </AppShell>
  );
}
