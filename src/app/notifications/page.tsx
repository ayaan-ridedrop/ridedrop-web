// /notifications — simple activity feed.
// For V1 we synthesise notifications from recent booking/message activity
// rather than a separate notifications table. When push notifications are
// added in Phase 2, this gets replaced with a proper feed.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function NotificationsPage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Recent bookings the user is in.
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, updated_at, sender_id, carrier_id,
      jobs!inner(from_station, to_station)
    `)
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })
    .limit(20);

  // Recent messages from other people to the user (i.e. on their bookings).
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id, body, created_at, sender_id, booking_id,
      bookings!inner(id, sender_id, carrier_id,
        jobs!inner(from_station, to_station))
    `)
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15);

  type Item = { time: string; icon: string; title: string; body: string; href: string };
  const items: Item[] = [];

  for (const b of bookings ?? []) {
    const j = (b as any).jobs;
    const youSent = b.sender_id === user.id;
    items.push({
      time: b.updated_at,
      icon: STATUS_ICON[b.status as string] ?? '📦',
      title: `${j.from_station} → ${j.to_station}`,
      body: `${youSent ? 'Your delivery' : 'Your job'} is now ${b.status.replace('_', ' ')}`,
      href: `/bookings/${b.id}`,
    });
  }
  for (const m of messages ?? []) {
    const j = (m as any).bookings.jobs;
    items.push({
      time: m.created_at,
      icon: '💬',
      title: `New message on ${j.from_station} → ${j.to_station}`,
      body: m.body.slice(0, 100),
      href: `/bookings/${(m as any).bookings.id}`,
    });
  }
  items.sort((a, b) => b.time.localeCompare(a.time));

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Activity</h1>
      <p className="text-ink-soft mb-8 font-light">
        Recent updates on your jobs, journeys, and bookings.
      </p>

      {items.length === 0 ? (
        <p className="text-ink-muted">Nothing yet. Post a job or list a journey to get going.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 30).map((n, i) => (
            <li key={i}>
              <Link
                href={n.href}
                className="bg-white border border-rail rounded-2xl p-4 flex items-start gap-3 hover:border-ink transition"
              >
                <span className="text-2xl">{n.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-sm text-ink-soft font-light">{n.body}</div>
                  <div className="text-xs text-ink-muted mt-1">
                    {new Date(n.time).toLocaleString('en-GB')}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

const STATUS_ICON: Record<string, string> = {
  proposed: '⚖',
  accepted: '✅',
  picked_up: '🤝',
  in_transit: '🚂',
  delivered: '📦',
  completed: '🎉',
  disputed: '⚠',
  cancelled: '✗',
};
