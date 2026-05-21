'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BookJourneyForm({
  journeyId,
  jobs,
}: {
  journeyId: string;
  jobs: Array<{ id: string; package_description: string; max_budget_pence: number }>;
}) {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [agreedPrice, setAgreedPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const maxPrice = selectedJob ? selectedJob.max_budget_pence / 100 : 0;

  async function handleBook() {
    if (!selectedJobId || agreedPrice <= 0) {
      setError('Please select a job and enter an agreed price');
      return;
    }

    if (agreedPrice > maxPrice) {
      setError(`Price cannot exceed your budget of £${maxPrice.toFixed(2)}`);
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

    // Create booking
    const { data: booking, error: err } = await supabase
      .from('bookings')
      .insert({
        journey_id: journeyId,
        job_id: selectedJobId,
        sender_id: user.id,
        carrier_id: null, // Will be filled from journey
        agreed_price_pence: Math.round(agreedPrice * 100),
        status: 'accepted', // Automatically accepted when sender books
      })
      .select()
      .single();

    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Navigate to booking
    router.push(`/bookings/${booking.id}`);
    router.refresh();
  }

  return (
    <div className="bg-white border border-rail rounded-2xl p-6 sticky top-4">
      <h3 className="text-lg font-display font-bold mb-4">Book this journey</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-ink-muted uppercase tracking-wider mb-2">
            Your job
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={submitting}
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white disabled:opacity-50"
          >
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.package_description}
              </option>
            ))}
          </select>
        </div>

        {selectedJob && (
          <div className="bg-ink-soft/5 rounded-lg p-3">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
              Your max budget
            </div>
            <div className="font-display font-bold text-lg">
              £{maxPrice.toFixed(2)}
            </div>
          </div>
        )}

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
            You'll pay this amount. Carrier gets 80%.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          onClick={handleBook}
          disabled={submitting || !selectedJobId || agreedPrice <= 0}
          className="w-full bg-accent text-white rounded-full px-6 py-3 font-medium hover:bg-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  );
}
