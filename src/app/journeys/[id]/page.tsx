// /journeys/[id] — sender views journey details and can book it for their job

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import BookJourneyForm from './BookJourneyForm';

export default async function JourneyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Get journey details
  const { data: journey } = await supabase
    .from('journeys')
    .select('*, carrier:profiles!journeys_carrier_id_fkey(first_name, last_name, rating, total_reviews)')
    .eq('id', params.id)
    .eq('status', 'listed')
    .maybeSingle();

  if (!journey) notFound();

  // Get sender's open jobs for this route
  const { data: senderJobs } = await supabase
    .from('jobs')
    .select('id, package_description, package_size, must_arrive_by, status')
    .eq('sender_id', user.id)
    .eq('from_station', journey.from_station)
    .eq('to_station', journey.to_station)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const j = journey as any;
  const carrierName = `${j.carrier?.first_name ?? ''} ${j.carrier?.last_name ?? ''}`.trim();
  const carrierRating = j.carrier?.rating || 0;
  const carrierReviews = j.carrier?.total_reviews || 0;

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/journeys/browse" className="text-sm text-accent underline">
        ← Back to journeys
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Journey details */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-white border border-rail rounded-2xl p-6">
            <h1 className="text-4xl font-display font-bold mb-2">
              {j.from_station} → {j.to_station}
            </h1>
            <p className="text-ink-soft mb-6">
              {new Date(j.departure_at).toLocaleString('en-GB')}
              {j.train_operator && ` · ${j.train_operator}`}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                  Departure
                </div>
                <div className="font-medium">
                  {new Date(j.departure_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                  Arrival
                </div>
                <div className="font-medium">
                  {new Date(j.arrival_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                  Minimum price
                </div>
                <div className="font-display font-bold text-accent text-lg">
                  £{(j.minimum_price_pence / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                  Capacity left
                </div>
                <div className="font-medium">
                  {j.slots_remaining} slot{j.slots_remaining === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {j.food_ok && (
              <div className="mt-4 text-xs text-green-600 bg-green-50 rounded-lg p-2">
                Carrier is happy to carry food items
              </div>
            )}
          </div>

          {/* Carrier info */}
          <div className="bg-white border border-rail rounded-2xl p-6">
            <h2 className="text-xl font-display font-bold mb-4">Carrier</h2>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{carrierName}</div>
                <div className="text-sm text-ink-soft mt-1">
                  {carrierRating > 0 ? (
                    <>
                      {carrierRating.toFixed(1)} · {carrierReviews} review{carrierReviews !== 1 ? 's' : ''}
                    </>
                  ) : (
                    'No reviews yet'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="col-span-1">
          {senderJobs && senderJobs.length > 0 ? (
            <BookJourneyForm journeyId={j.id} jobs={senderJobs} />
          ) : (
            <div className="bg-white border border-rail rounded-2xl p-6 text-center">
              <p className="text-sm text-ink-soft mb-4">
                You don't have any open jobs for this route.
              </p>
              <Link
                href={`/send?from=${j.from_station}&to=${j.to_station}`}
                className="text-sm text-accent underline"
              >
                Post a new job
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
