import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import BidForm from '@/components/BidForm';
import BidsList from '@/components/BidsList';

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch the job
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!job) notFound();

  const youAreOwner = job.sender_id === user.id;

  // If you're the carrier, fetch your journeys
  let myJourneys = [];
  if (!youAreOwner) {
    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('carrier_id', user.id)
      .eq('status', 'listed')
      .gt('departure_at', new Date().toISOString());
    myJourneys = journeys || [];
  }

  // Fetch bids on this job
  let bids: any[] = [];
  let bidCarriers: Record<string, any> = {};
  let bidJourneys: Record<string, any> = {};

  if (youAreOwner) {
    const { data: bidData } = await supabase
      .from('bids')
      .select('id, carrier_id, journey_id, amount_pence, status')
      .eq('job_id', job.id);
    bids = bidData || [];

    if (bids.length > 0) {
      // Fetch carrier profiles
      const carrierIds = [...new Set(bids.map((b) => b.carrier_id))];
      const { data: carriers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', carrierIds);
      carriers?.forEach((c) => {
        bidCarriers[c.id] = c;
      });

      // Fetch journeys
      const journeyIds = [...new Set(bids.map((b) => b.journey_id))];
      const { data: journeyData } = await supabase
        .from('journeys')
        .select('id, from_station, to_station, departure_at, arrival_at')
        .in('id', journeyIds);
      journeyData?.forEach((j) => {
        bidJourneys[j.id] = j;
      });
    }
  }

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/jobs" className="text-sm text-accent underline">
        ← All jobs
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="col-span-1">
          <h1 className="text-4xl font-bold mb-2">{job.from_station} → {job.to_station}</h1>
          <p className="text-lg text-ink-soft mb-6">{job.package_description}</p>

          {/* Job details */}
          <div className="bg-white border border-rail rounded-2xl p-5 space-y-3 text-sm mb-6">
            <Row label="Max budget">
              £{(job.max_budget_pence / 100).toFixed(2)}
            </Row>
            <Row label="Package size">{job.package_size}</Row>
            <Row label="Status">{job.status}</Row>
            {job.package_weight_kg && (
              <Row label="Weight">{job.package_weight_kg} kg</Row>
            )}
            {job.declared_value_pence > 0 && (
              <Row label="Declared value">
                £{(job.declared_value_pence / 100).toFixed(2)}
              </Row>
            )}
          </div>

          {/* If you're NOT the owner and the job is open, show bid form */}
          {!youAreOwner && job.status === 'open' && (
            <BidForm jobId={job.id} maxBudgetPence={job.max_budget_pence} journeys={myJourneys} />
          )}

          {!youAreOwner && job.status !== 'open' && (
            <div className="bg-cream border border-rail rounded-2xl px-5 py-3 text-sm">
              This job is no longer open ({job.status}).
            </div>
          )}
        </div>

        {/* Right column: bids (only if owner) */}
        {youAreOwner && (
          <div className="col-span-1">
            <BidsList jobId={job.id} bids={bids} carriers={bidCarriers} journeys={bidJourneys} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center border-b border-rail/60 last:border-b-0 pb-2 last:pb-0">
      <span className="text-xs text-ink-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}
