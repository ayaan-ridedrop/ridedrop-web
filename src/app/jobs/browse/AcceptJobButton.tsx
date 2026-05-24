'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendBookingNotification } from '@/lib/actions/send-booking-notification';

export default function AcceptJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [agreedPrice, setAgreedPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openModal() {
    setShowModal(true);
    setLoading(true);
    setError(null);

    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    // Get the job details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('from_station, to_station, sender_id')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      setError('Job not found or access denied. Try refreshing the page.');
      setLoading(false);
      console.error('[job fetch] error:', jobErr);
      return;
    }

    // Get carrier's journeys that match this job's route (include both listed and pending verification)
    const { data: carrierJourneys } = await supabase
      .from('journeys')
      .select('id, departure_at, arrival_at, train_operator, minimum_price_pence, slots_remaining, status')
      .eq('carrier_id', user.id)
      .eq('from_station', job.from_station)
      .eq('to_station', job.to_station)
      .in('status', ['listed', 'ticket_pending'])
      .gt('slots_remaining', 0);

    if (!carrierJourneys || carrierJourneys.length === 0) {
      setError('You don\'t have any matching journeys for this route');
      setLoading(false);
      return;
    }

    setJourneys(carrierJourneys);
    setSelectedJourneyId(carrierJourneys[0]?.id || '');
    setLoading(false);
  }

  async function handleAccept() {
    if (!selectedJourneyId || agreedPrice <= 0) {
      setError('Please select a journey and enter an agreed price');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not signed in');
      setSubmitting(false);
      return;
    }

    // Get job and journey details
    const { data: job } = await supabase.from('jobs').select('max_budget_pence, sender_id, from_station, to_station').eq('id', jobId).single();
    const { data: journey } = await supabase.from('journeys').select('carrier_id').eq('id', selectedJourneyId).single();

    if (!job || !journey) {
      setError('Job or journey not found');
      setSubmitting(false);
      return;
    }

    // Check price is within sender's budget
    const jobMaxPrice = job.max_budget_pence / 100;
    if (agreedPrice > jobMaxPrice) {
      setError(`Price cannot exceed job budget of £${jobMaxPrice.toFixed(2)}`);
      setSubmitting(false);
      return;
    }

    // Create booking
    const { data: booking, error: err } = await supabase
      .from('bookings')
      .insert({
        journey_id: selectedJourneyId,
        job_id: jobId,
        sender_id: job.sender_id,
        carrier_id: user.id,
        agreed_price_pence: Math.round(agreedPrice * 100),
        status: 'accepted',
      })
      .select()
      .single();

    if (err) {
      setSubmitting(false);
      setError(err.message);
      return;
    }

    // Update job status to 'matched' so it's no longer available
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ status: 'matched' })
      .eq('id', jobId);

    if (updateErr) {
      console.error('[job status update] error:', updateErr);
      // Don't fail the whole thing if status update fails
    }

    // Get sender info for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('first_name, email')
      .eq('id', job.sender_id)
      .single();

    // Send notification to sender
    if (senderProfile?.email) {
      const carrierName = `${user.email?.split('@')[0]}`;
      await sendBookingNotification(
        booking.id,
        senderProfile.email,
        senderProfile.first_name || 'User',
        carrierName,
        `${job.from_station} → ${job.to_station}`,
        agreedPrice
      );
    }

    setSubmitting(false);
    setShowModal(false);
    router.push(`/bookings/${booking.id}`);
    router.refresh();
  }

  if (!showModal) {
    return (
      <button
        onClick={openModal}
        className="text-sm bg-ink text-white rounded-full px-4 py-2 font-medium hover:bg-accent transition"
      >
        Accept job
      </button>
    );
  }

  return (
    <>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setShowModal(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold">Accept job</h3>
            <button
              onClick={() => setShowModal(false)}
              disabled={submitting}
              className="text-ink-muted hover:text-ink text-2xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <p className="text-ink-soft">Loading your journeys...</p>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              {error}
            </div>
          ) : journeys.length === 0 ? (
            <p className="text-ink-soft">No matching journeys found</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ink-muted uppercase tracking-wider mb-2">
                  Your journey
                </label>
                <select
                  value={selectedJourneyId}
                  onChange={(e) => setSelectedJourneyId(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white disabled:opacity-50"
                >
                  {journeys.map(j => (
                    <option key={j.id} value={j.id}>
                      {new Date(j.departure_at).toLocaleString('en-GB')} · {j.train_operator}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-ink-muted uppercase tracking-wider mb-2">
                  Agreed price (£)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreedPrice || ''}
                  onChange={(e) => setAgreedPrice(Number(e.target.value))}
                  placeholder="0.00"
                  disabled={submitting}
                  className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
                />
                <p className="text-xs text-ink-soft mt-1">
                  You keep 80% of this price.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 border border-rail rounded-full px-4 py-3 font-medium hover:bg-rail transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={submitting || !selectedJourneyId || agreedPrice <= 0}
                  className="flex-1 bg-accent text-white rounded-full px-4 py-3 font-medium hover:bg-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Accepting…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
