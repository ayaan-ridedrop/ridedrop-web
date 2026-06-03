'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Booking {
  id: string;
  status: string;
  agreed_price_pence: number;
  created_at: string;
  journey_id: string;
  job_id: string;
}

interface Journey {
  id: string;
  from_station: string;
  to_station: string;
  departure_at: string;
  status: string;
  created_at: string;
  minimum_price_pence: number;
}

interface Job {
  id: string;
  from_station: string;
  to_station: string;
  status: string;
  created_at: string;
  must_arrive_by: string | null;
}

interface Props {
  bookings: Booking[];
  journeys: Journey[];
  jobs: Job[];
  isCarrier: boolean;
}

export default function DashboardTabs({ bookings, journeys, jobs, isCarrier }: Props) {
  const [tab, setTab] = useState<'active' | 'completed' | 'archived'>('active');

  // Helper: check if booking is older than 24h
  const isOlderThan24h = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 24;
  };

  // Categorize bookings
  const activeBookings = bookings.filter((b) =>
    ['accepted', 'picked_up', 'in_transit', 'delivered'].includes(b.status)
  );
  const completedBookings = bookings.filter(
    (b) => b.status === 'completed' && !isOlderThan24h(b.created_at)
  );
  const archivedBookings = bookings.filter((b) =>
    ['cancelled', 'disputed'].includes(b.status) ||
    (b.status === 'completed' && isOlderThan24h(b.created_at))
  );

  // Categorize journeys
  const activeJourneys = journeys.filter(
    (j) => ['listed', 'in_progress'].includes(j.status) && new Date(j.departure_at) > new Date()
  );
  const completedJourneys = journeys.filter(
    (j) => j.status === 'completed' && !isOlderThan24h(j.created_at)
  );
  const pastJourneys = journeys.filter(
    (j) => (new Date(j.departure_at) <= new Date() && j.status !== 'completed') ||
           (j.status === 'completed' && isOlderThan24h(j.created_at))
  );

  // Categorize jobs
  const activeJobs = jobs.filter(
    (j) => j.status === 'open' && new Date(j.must_arrive_by || 0) > new Date()
  );
  const matchedJobs = jobs.filter((j) => j.status === 'matched');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const expiredJobs = jobs.filter(
    (j) => ['open', 'matched'].includes(j.status) && new Date(j.must_arrive_by || 0) <= new Date()
  );

  const tabContent = {
    active: {
      items: [
        ...activeBookings.map((b) => ({
          type: 'booking' as const,
          id: b.id,
          label: `Booking · ${b.status}`,
          price: b.agreed_price_pence / 100,
          href: `/bookings/${b.id}`,
        })),
        ...matchedJobs.map((j) => ({
          type: 'job' as const,
          id: j.id,
          label: `${j.from_station} → ${j.to_station} · Matched`,
          price: null,
          href: `/jobs/${j.id}`,
        })),
        ...(isCarrier
          ? activeJourneys.map((j) => ({
              type: 'journey' as const,
              id: j.id,
              label: `${j.from_station} → ${j.to_station} · Listed`,
              price: j.minimum_price_pence / 100,
              href: `/journeys/${j.id}`,
            }))
          : []),
      ],
      empty: 'No active items. Get started above!',
    },
    completed: {
      items: [
        ...completedBookings.map((b) => ({
          type: 'booking' as const,
          id: b.id,
          label: `Booking · Completed`,
          price: b.agreed_price_pence / 100,
          href: `/bookings/${b.id}`,
        })),
        ...completedJobs.map((j) => ({
          type: 'job' as const,
          id: j.id,
          label: `${j.from_station} → ${j.to_station} · Completed`,
          price: null,
          href: `/jobs/${j.id}`,
        })),
        ...(isCarrier
          ? completedJourneys.map((j) => ({
              type: 'journey' as const,
              id: j.id,
              label: `${j.from_station} → ${j.to_station} · Completed`,
              price: j.minimum_price_pence / 100,
              href: `/journeys/${j.id}`,
            }))
          : []),
      ],
      empty: 'No completed deliveries yet. Keep going!',
    },
    archived: {
      items: [
        ...archivedBookings.map((b) => ({
          type: 'booking' as const,
          id: b.id,
          label: `Booking · ${b.status}`,
          price: b.agreed_price_pence / 100,
          href: `/bookings/${b.id}`,
        })),
        ...expiredJobs.map((j) => ({
          type: 'job' as const,
          id: j.id,
          label: `${j.from_station} → ${j.to_station} · ${j.status === 'open' ? 'Expired' : 'Cancelled'}`,
          price: null,
          href: `/jobs/${j.id}`,
        })),
        ...(isCarrier
          ? pastJourneys.map((j) => ({
              type: 'journey' as const,
              id: j.id,
              label: `${j.from_station} → ${j.to_station} · Past`,
              price: j.minimum_price_pence / 100,
              href: `/journeys/${j.id}`,
            }))
          : []),
      ],
      empty: 'No archived items.',
    },
  };

  const current = tabContent[tab];

  return (
    <section className="mb-10">
      {/* TAB BUTTONS */}
      <div className="flex gap-2 mb-6 border-b border-rail">
        {(['active', 'completed', 'archived'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 font-medium text-sm transition border-b-2 ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'active' && 'Active'}
            {t === 'completed' && 'Completed'}
            {t === 'archived' && 'Archived'}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {current.items.length === 0 ? (
        <p className="text-ink-soft text-sm font-light">{current.empty}</p>
      ) : (
        <ul className="space-y-2">
          {current.items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link
                href={item.href}
                className="bg-white border border-rail rounded-xl px-5 py-3 flex items-center justify-between hover:border-accent transition text-sm"
              >
                <span>{item.label}</span>
                {item.price !== null && (
                  <span className="font-display font-bold text-accent">
                    £{item.price.toFixed(2)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
