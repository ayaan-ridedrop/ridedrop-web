// /journeys/browse — sender browses available carrier journeys.
// (In the prototype this is the "choose a carrier" step after posting a job.)

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function BrowseJourneysPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();
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
    .order('departure_at', { ascending: true })
    .limit(50);

  if (searchParams.from) q = q.eq('from_station', searchParams.from);
  if (searchParams.to) q = q.eq('to_station', searchParams.to);

  const { data: journeys } = await q;

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Find a carrier</h1>
      <p className="text-ink-soft mb-8 font-light">
        These travellers have already listed their journey and verified their
        ticket. Pick one to send your package with.
      </p>

      {!journeys?.length ? (
        <div className="bg-white border border-rail rounded-2xl p-8 text-center text-ink-muted">
          No matching journeys right now. Post a job and carriers can apply, or
          check back later — new journeys are listed every day.
        </div>
      ) : (
        <ul className="space-y-3">
          {journeys.map((j) => (
            <li
              key={j.id}
              className="bg-white border border-rail rounded-2xl p-5 flex items-center justify-between"
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
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
