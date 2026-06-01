// /jobs/your-jobs — sender views and manages their own jobs
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CancelJobButton from './CancelJobButton';

export default async function YourJobsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, from_station, to_station, package_description, package_size, must_arrive_by, status, created_at')
    .eq('sender_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  const openJobs = jobs?.filter((j: any) => j.status === 'open') ?? [];
  const matchedJobs = jobs?.filter((j: any) => j.status === 'matched') ?? [];
  const completedJobs = jobs?.filter((j: any) => j.status === 'completed') ?? [];

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Your jobs</h1>
      <p className="text-ink-soft mb-8 font-light">
        Delivery requests you've posted. Cancel them before a carrier accepts.
      </p>

      {/* OPEN JOBS */}
      <div className="mb-10">
        <h2 className="text-2xl font-display font-bold mb-4">Open ({openJobs.length})</h2>
        {openJobs.length === 0 ? (
          <p className="text-ink-soft mb-6">No open jobs. <Link href="/send" className="text-accent underline">Post a new one</Link>.</p>
        ) : (
          <ul className="space-y-3 mb-6">
            {openJobs.map((j: any) => (
              <li key={j.id}>
                <div className="bg-white border border-rail rounded-2xl p-5 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-display font-bold">
                      {j.from_station} → {j.to_station}
                    </div>
                    <div className="text-sm text-ink-soft">{j.package_description}</div>
                    <div className="text-xs text-ink-muted mt-1">
                      Size: {j.package_size}
                      {j.must_arrive_by && (
                        <> · Must arrive by {new Date(j.must_arrive_by).toLocaleString('en-GB')}</>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex flex-col gap-2">
                    <div className="font-display font-extrabold text-accent text-xl">
                      up to £{(j.max_budget_pence / 100).toFixed(0)}
                    </div>
                    <CancelJobButton jobId={j.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MATCHED JOBS */}
      {matchedJobs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-display font-bold mb-4">Matched ({matchedJobs.length})</h2>
          <ul className="space-y-3 mb-6">
            {matchedJobs.map((j: any) => (
              <li key={j.id}>
                <Link
                  href={`/bookings`}
                  className="bg-white border border-accent rounded-2xl p-5 block"
                >
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-soft">{j.package_description}</div>
                  <div className="text-xs text-ink-muted mt-1">
                    Matched · £{(j.max_budget_pence / 100).toFixed(0)} budget
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMPLETED JOBS */}
      {completedJobs.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold mb-4">Completed ({completedJobs.length})</h2>
          <ul className="space-y-3">
            {completedJobs.map((j: any) => (
              <li key={j.id}>
                <div className="bg-white border border-rail rounded-2xl p-5 opacity-60">
                  <div className="font-display font-bold">
                    {j.from_station} → {j.to_station}
                  </div>
                  <div className="text-sm text-ink-soft">{j.package_description}</div>
                  <div className="text-xs text-ink-muted mt-1">Completed</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
