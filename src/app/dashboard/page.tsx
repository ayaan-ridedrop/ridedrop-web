// /dashboard — landing for logged-in users.
// Shows: active bookings + job/journey management with status tabs

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import DashboardTabs from './DashboardTabs';

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

  // Fetch ALL bookings (not just active) for filtering
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, agreed_price_pence, created_at, journey_id, job_id')
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  // Fetch journeys with details
  const { data: allJourneys } = await supabase
    .from('journeys')
    .select('id, from_station, to_station, departure_at, status, carrier_id, created_at, minimum_price_pence')
    .eq('carrier_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch jobs (for senders)
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('id, from_station, to_station, status, created_at, must_arrive_by')
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false });

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

      {/* STATUS TABS FOR ACTIVITY */}
      <DashboardTabs
        bookings={bookings || []}
        journeys={isCarrier ? (allJourneys || []) : []}
        jobs={allJobs || []}
        isCarrier={isCarrier}
      />

      {/* LINK TO FULL ACTIVITY */}
      <section className="mt-10 text-sm">
        <Link href="/activity" className="text-accent hover:underline font-medium">
          → View all activity (bookings, jobs, journeys)
        </Link>
      </section>
    </AppShell>
  );
}
