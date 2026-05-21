// /jobs/browse — carrier browses open jobs (senders looking for someone).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AcceptJobButton from './AcceptJobButton';
import type { BrowseJob } from '@/lib/types';

export default async function BrowseJobsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  let q = supabase
    .from('jobs')
    .select('id, from_station, to_station, package_description, package_size, max_budget_pence, must_arrive_by, created_at')
    .eq('status', 'open')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(50);
  if (searchParams.from) q = q.eq('from_station', searchParams.from);
  if (searchParams.to) q = q.eq('to_station', searchParams.to);

  const { data: jobs } = await q as { data: BrowseJob[] | null };

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Open jobs</h1>
      <p className="text-ink-soft mb-8 font-light">
        Delivery requests posted by senders. Pick one that fits the train you're
        already on.
      </p>

      {!isCarrier && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 text-sm text-amber-900">
          You're browsing as a sender. To accept a job you need to switch on
          carrier mode in your profile and complete ID verification.
        </div>
      )}

      {!jobs?.length ? (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted mb-3">No open jobs match your search right now.</p>
          <Link href="/journeys/browse" className="text-sm text-accent underline font-medium">
            Browse available journeys instead →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <div className="bg-white border border-rail rounded-2xl p-5 flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-soft">
                    {j.package_description}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    Size: {j.package_size}
                    {j.must_arrive_by && (
                      <> · Must arrive by {new Date(j.must_arrive_by).toLocaleString('en-GB')}</>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-display font-extrabold text-accent text-xl mb-3">
                    up to £{(j.max_budget_pence / 100).toFixed(0)}
                  </div>
                  {isCarrier ? (
                    <AcceptJobButton jobId={j.id} />
                  ) : (
                    <div className="text-xs text-ink-muted">
                      carrier keeps 80%
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
