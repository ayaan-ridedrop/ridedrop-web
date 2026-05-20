// /jobs/browse — carrier browses open jobs (senders looking for someone).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
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
    .gt('must_arrive_by', new Date().toISOString())
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
        <p className="text-ink-muted">No open jobs right now.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
            <Link
              href={`/jobs/${j.id}`}
              className="bg-white border border-rail rounded-2xl p-5 flex items-center justify-between hover:border-ink transition"
            >
              <div>
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
              <div className="text-right">
                <div className="font-display font-extrabold text-accent text-xl">
                  up to £{(j.max_budget_pence / 100).toFixed(0)}
                </div>
                <div className="text-xs text-ink-muted">
                  carrier keeps 80%
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
