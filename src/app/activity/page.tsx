import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function ActivityPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  // Fetch all bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, agreed_price_pence, created_at, journey_id')
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  // Fetch all journeys to check departure times
  const { data: allJourneys } = await supabase
    .from('journeys')
    .select('id, departure_at');

  const journeyMap = new Map(allJourneys?.map((j: any) => [j.id, j]) ?? []);

  // Fetch all jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, from_station, to_station, status, max_budget_pence, deadline_at, created_at')
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch all journeys (carriers only)
  const { data: journeys } = isCarrier
    ? (
        await supabase
          .from('journeys')
          .select('id, from_station, to_station, departure_at, status, created_at')
          .eq('carrier_id', user.id)
          .order('created_at', { ascending: false })
      ).data
    : [];

  // Categorize items
  type ActivityItem = {
    type: 'booking' | 'job' | 'journey';
    id: string;
    title: string;
    status: string;
    price?: number | null;
    date: string;
    section: 'active' | 'pending' | 'history';
  };

  const items: ActivityItem[] = [];

  // Bookings (hide if journey date passed)
  bookings?.forEach((b: any) => {
    const journey = journeyMap.get(b.journey_id) as any;
    const journeyDeparted = journey && new Date(journey.departure_at) < new Date();
    const isActive = ['accepted', 'picked_up', 'in_transit'].includes(b.status) && !journeyDeparted;
    const isPending = b.status === 'delivered' && !journeyDeparted;
    const isHistory = ['completed', 'cancelled', 'disputed'].includes(b.status) || journeyDeparted;

    items.push({
      type: 'booking',
      id: b.id,
      title: `Booking · ${b.status}`,
      status: b.status,
      price: b.agreed_price_pence / 100,
      date: b.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : 'history',
    });
  });

  // Jobs (hide if deadline passed)
  jobs?.forEach((j: any) => {
    const deadlinePassed = new Date(j.deadline_at) < new Date();
    if (deadlinePassed) return; // Skip expired jobs

    const isActive = j.status === 'open';
    const isPending = j.status === 'matched';
    const isHistory = j.status === 'cancelled';

    items.push({
      type: 'job',
      id: j.id,
      title: `${j.from_station} → ${j.to_station}`,
      status: j.status,
      price: j.max_budget_pence / 100,
      date: j.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : isHistory ? 'history' : 'history',
    });
  });

  // Journeys (hide if departure time passed)
  journeys?.forEach((j: any) => {
    const depTime = new Date(j.departure_at);
    const now = new Date();
    if (depTime < now && j.status !== 'full' && j.status !== 'cancelled') return; // Skip if past departure and not full/cancelled

    const isActive = j.status === 'listed' && depTime > now;
    const isPending = j.status === 'full' || (j.status === 'listed' && depTime <= now);
    const isHistory = j.status === 'cancelled';

    items.push({
      type: 'journey',
      id: j.id,
      title: `${j.from_station} → ${j.to_station}`,
      status: j.status,
      price: null,
      date: j.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : isHistory ? 'history' : 'history',
    });
  });

  const activeItems = items.filter((i) => i.section === 'active');
  const pendingItems = items.filter((i) => i.section === 'pending');
  const historyItems = items.filter((i) => i.section === 'history');

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-1">My Activity</h1>
      <p className="text-ink-soft mb-8 font-light">All your deliveries, jobs, and journeys in one place.</p>

      {/* ACTIVE NOW */}
      {activeItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Active Now</h2>
          <ul className="space-y-2">
            {activeItems.map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {/* PENDING / MATCHED */}
      {pendingItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Pending / Matched</h2>
          <ul className="space-y-2">
            {pendingItems.map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {/* HISTORY */}
      {historyItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">History</h2>
          <ul className="space-y-2">
            {historyItems.map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 && (
        <p className="text-ink-soft text-sm">No activity yet. Post a job or journey to get started.</p>
      )}
    </AppShell>
  );
}

function ActivityCard({ item }: { item: any }) {
  const href =
    item.type === 'booking'
      ? `/bookings/${item.id}`
      : item.type === 'job'
        ? `/jobs/your-jobs`
        : `/journeys/your-journeys`;

  const badge = item.type === 'booking' ? '📦' : item.type === 'job' ? '📋' : '🚂';
  const badgeLabel = item.type === 'booking' ? 'Booking' : item.type === 'job' ? 'Job' : 'Journey';

  return (
    <li className="bg-white border border-rail rounded-xl px-5 py-4 flex items-center justify-between hover:border-accent transition">
      <Link href={href} className="flex-1 flex items-center gap-3 hover:text-accent">
        <span className="text-lg">{badge}</span>
        <div>
          <div className="text-sm font-medium">{item.title}</div>
          <div className="text-xs text-ink-muted">
            {badgeLabel} · {new Date(item.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </Link>
      {item.price !== null && (
        <span className="font-display font-bold ml-4">£{item.price.toFixed(2)}</span>
      )}
    </li>
  );
}
