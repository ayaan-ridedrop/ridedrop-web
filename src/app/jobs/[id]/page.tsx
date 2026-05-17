// /jobs/[id] — job detail view, with the carrier's accept form
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AcceptJobForm from './AcceptJobForm';
import { RIDEDROP_COMMISSION } from '@/lib/types';

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: job }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, role')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('jobs')
      .select('*')
      .eq('id', params.id)
      .maybeSingle(),
  ]);

  if (!job) notFound();

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';
  const isOwnJob = job.sender_id === user.id;

  // Find this carrier's listed journeys that match the job's route.
  const { data: matchingJourneys } = isCarrier && !isOwnJob
    ? await supabase
        .from('journeys')
        .select('id, departure_at, train_operator, minimum_price_pence, slots_remaining')
        .eq('carrier_id', user.id)
        .eq('status', 'listed')
        .eq('from_station', job.from_station)
        .eq('to_station', job.to_station)
        .gt('slots_remaining', 0)
        .order('departure_at', { ascending: true })
    : { data: null };

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/jobs/browse" className="text-sm text-accent underline">
        ← Back to all jobs
      </Link>
      <h1 className="text-4xl mt-4 mb-2">
        {job.from_station} → {job.to_station}
      </h1>
      <p className="text-ink-soft font-light mb-8">
        {job.package_description}
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Detail label="Size">{job.package_size}</Detail>
        <Detail label="Weight">
          {job.package_weight_kg ? `${job.package_weight_kg} kg` : '—'}
        </Detail>
        <Detail label="Declared value">
          £{(job.declared_value_pence / 100).toFixed(2)}
        </Detail>
        <Detail label="Must arrive by">
          {job.must_arrive_by
            ? new Date(job.must_arrive_by).toLocaleString('en-GB')
            : 'No deadline'}
        </Detail>
        <Detail label="Sender's max budget">
          £{(job.max_budget_pence / 100).toFixed(2)}
        </Detail>
        <Detail label="Status">{job.status}</Detail>
      </div>

      {isOwnJob ? (
        <div className="bg-cream border border-rail rounded-2xl p-5 text-sm">
          This is your own job. Carriers on your route can accept it.
        </div>
      ) : !isCarrier ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-900">
          Switch on carrier mode in <Link href="/profile" className="underline font-medium">your profile</Link> to accept jobs.
        </div>
      ) : job.status !== 'open' ? (
        <div className="bg-cream border border-rail rounded-2xl p-5 text-sm">
          This job is no longer open ({job.status}).
        </div>
      ) : !matchingJourneys?.length ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-900">
          You don't have a listed journey on this route yet.{' '}
          <Link href="/journeys/new" className="underline font-medium">
            List one to accept this job →
          </Link>
        </div>
      ) : (
        <AcceptJobForm
          jobId={job.id}
          maxBudgetGbp={job.max_budget_pence / 100}
          commissionPct={RIDEDROP_COMMISSION * 100}
          journeys={matchingJourneys.map((j) => ({
            id: j.id,
            label: `${new Date(j.departure_at).toLocaleString('en-GB')}${j.train_operator ? ` · ${j.train_operator}` : ''}`,
            minPriceGbp: j.minimum_price_pence / 100,
            slotsRemaining: j.slots_remaining,
          }))}
        />
      )}
    </AppShell>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-rail rounded-xl p-4">
      <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
