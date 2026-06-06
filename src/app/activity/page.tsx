import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ActivityFilter from './ActivityFilter';

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const filterType = params.type || 'all';
  const filterStatus = params.status || 'all';
  const sortBy = params.sort || 'newest';

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  // Fetch all bookings (with join to journey for departure time)
  const { data: bookings } = await supabase
    .from('bookings')
    .select(
      'id, status, agreed_price_pence, created_at, journey_id, job_id, journeys(departure_at, from_station, to_station), jobs(from_station, to_station)'
    )
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  // Fetch all jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, from_station, to_station, status, must_arrive_by, created_at')
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
    fromStation: string;
    toStation: string;
    status: string;
    price?: number | null;
    date: string;
    section: 'active' | 'pending' | 'history';
    createdAtMs: number;
  };

  const items: ActivityItem[] = [];

  // Bookings
  bookings?.forEach((b: any) => {
    const journey = b.journeys as any;
    const job = b.jobs as any;
    const journeyDeparted = journey && new Date(journey.departure_at) < new Date();
    const isActive = ['accepted', 'picked_up', 'in_transit'].includes(b.status) && !journeyDeparted;
    const isPending = b.status === 'delivered' && !journeyDeparted;
    const isHistory = ['completed', 'cancelled', 'disputed'].includes(b.status) || journeyDeparted;

    items.push({
      type: 'booking',
      id: b.id,
      fromStation: journey?.from_station || job?.from_station || '—',
      toStation: journey?.to_station || job?.to_station || '—',
      status: b.status,
      price: b.agreed_price_pence / 100,
      date: b.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : 'history',
      createdAtMs: new Date(b.created_at).getTime(),
    });
  });

  // Jobs
  jobs?.forEach((j: any) => {
    const deadlinePassed = new Date(j.must_arrive_by) < new Date();
    const isActive = j.status === 'open' && !deadlinePassed;
    const isPending = j.status === 'matched';
    const isHistory = ['completed', 'cancelled'].includes(j.status) || (j.status === 'open' && deadlinePassed);

    items.push({
      type: 'job',
      id: j.id,
      fromStation: j.from_station,
      toStation: j.to_station,
      status: j.status,
      price: null,
      date: j.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : 'history',
      createdAtMs: new Date(j.created_at).getTime(),
    });
  });

  // Journeys
  journeys?.forEach((j: any) => {
    const depTime = new Date(j.departure_at);
    const now = new Date();
    const isActive = j.status === 'listed' && depTime > now;
    const isPending = j.status === 'full' || (j.status === 'listed' && depTime <= now);
    const isHistory = j.status === 'cancelled' || (depTime < now && j.status !== 'full');

    items.push({
      type: 'journey',
      id: j.id,
      fromStation: j.from_station,
      toStation: j.to_station,
      status: j.status,
      price: null,
      date: j.created_at,
      section: isActive ? 'active' : isPending ? 'pending' : 'history',
      createdAtMs: new Date(j.created_at).getTime(),
    });
  });

  // Filter
  let filtered = items
    .filter((i) => filterType === 'all' || i.type === filterType)
    .filter((i) => filterStatus === 'all' || i.status === filterStatus);

  // Sort
  if (sortBy === 'newest') {
    filtered.sort((a, b) => b.createdAtMs - a.createdAtMs);
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  const activeItems = filtered.filter((i) => i.section === 'active');
  const pendingItems = filtered.filter((i) => i.section === 'pending');
  const historyItems = filtered.filter((i) => i.section === 'history');

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">My Activity</h1>
        <p className="text-ink-soft">All your deliveries, jobs, and journeys in one place.</p>
      </div>

      {/* FILTERS */}
      <ActivityFilter currentType={filterType} currentStatus={filterStatus} currentSort={sortBy} />

      {/* RESULTS COUNT */}
      <p className="text-sm text-ink-muted mb-6">
        {filtered.length === 0 ? 'No activity' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* ACTIVE NOW */}
      {activeItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-display font-bold mb-4 text-accent">Active Now</h2>
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
          <h2 className="text-xl font-display font-bold mb-4">Pending</h2>
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
          <h2 className="text-xl font-display font-bold mb-4 text-ink-muted">History</h2>
          <ul className="space-y-2">
            {historyItems.map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted text-sm">No activity yet. Post a job or journey to get started.</p>
        </div>
      )}
    </AppShell>
  );
}

function ActivityCard({ item }: { item: any }) {
  const href =
    item.type === 'booking'
      ? `/bookings/${item.id}`
      : item.type === 'job'
        ? `/jobs/${item.id}`
        : `/journeys/${item.id}`;

  const icon = item.type === 'booking' ? '📦' : item.type === 'job' ? '📋' : '🚂';
  const typeLabel = item.type === 'booking' ? 'Booking' : item.type === 'job' ? 'Job' : 'Journey';

  // Status badge colors
  const statusColor = {
    'accepted': 'bg-blue-100 text-blue-700',
    'picked_up': 'bg-purple-100 text-purple-700',
    'in_transit': 'bg-orange-100 text-orange-700',
    'delivered': 'bg-yellow-100 text-yellow-700',
    'completed': 'bg-green-100 text-green-700',
    'open': 'bg-blue-100 text-blue-700',
    'matched': 'bg-purple-100 text-purple-700',
    'listed': 'bg-blue-100 text-blue-700',
    'full': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700',
    'disputed': 'bg-red-100 text-red-700',
  }[item.status as string] || 'bg-gray-100 text-gray-700';

  const dateStr = new Date(item.date).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="bg-white border border-rail rounded-xl px-5 py-4 hover:border-accent transition">
      <Link href={href} className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {item.fromStation} → {item.toStation}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
              </span>
              <span className="text-xs text-ink-muted">{dateStr}</span>
            </div>
          </div>
        </div>
        {item.price !== null && (
          <span className="font-display font-bold text-accent flex-shrink-0">£{item.price.toFixed(2)}</span>
        )}
      </Link>
    </li>
  );
}
