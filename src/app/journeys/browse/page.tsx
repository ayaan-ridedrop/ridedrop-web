// /journeys/browse — sender browses available carrier journeys.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import type { BrowseJourney } from '@/lib/types';

export default async function BrowseJourneysPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  let q = supabase
    .from('journeys')
    .select('id, from_station, to_station, departure_at, arrival_at, train_operator, minimum_price_pence, slots_remaining, carrier_id')
    .eq('status', 'listed')
    .gt('slots_remaining', 0)
    .not('status', 'eq', 'cancelled')
    .order('departure_at', { ascending: true })
    .limit(50);

  if (searchParams.from) q = q.eq('from_station', searchParams.from);
  if (searchParams.to) q = q.eq('to_station', searchParams.to);

  const { data: journeys } = await q as { data: BrowseJourney[] | null };

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Find a carrier</h1>
      <p className="text-ink-soft mb-8 font-light">
        These travellers have already listed their journey and verified their
        ticket. Pick one to send your package with.
      </p>

      {!journeys?.length ? (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted mb-3">No journeys match your route right now.</p>
          <Link href="/send" className="text-sm text-accent underline font-medium">
            Post a job instead — carriers will apply →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {journeys.map((j) => (
            <li key={j.id}>
              <Link
                href={`/journeys/${j.id}`}
                className="bg-white border border-rail rounded-2xl p-5 flex items-center justify-between hover:border-accent transition"
              >
                <div>
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-muted">
                    {new Date(j.departure_at).toLocaleString('en-GB')}
                    {j.train_operator ? ` · ${j.train_operator}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold text-accent text-xl">
                    £{(j.minimum_price_pence / 100).toFixed(0)}+
                  </div>
                  <div className="text-xs text-ink-muted">
                    {j.slots_remaining} slot{j.slots_remaining === 1 ? '' : 's'} left
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
