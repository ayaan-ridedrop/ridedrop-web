'use client';

import { useState } from 'react';
import { submitBid } from '@/lib/actions/submit-bid';
import { LoadingSpinner } from './LoadingSpinner';

export default function BidForm({
  jobId,
  journeys,
}: {
  jobId: string;
  journeys: Array<{ id: string; from_station: string; to_station: string; departure_at: string; arrival_at: string }>;
}) {
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.append('jobId', jobId);
    fd.append('journeyId', selectedJourneyId);
    fd.append('amountPence', String(Math.round(parseFloat(amount) * 100)));

    const res = await submitBid(fd);
    setSubmitting(false);

    if (res && 'error' in res) {
      setError({
        message: res.error ?? 'Something went wrong',
      });
    } else {
      setAmount('');
      setSelectedJourneyId('');
      alert('Bid submitted! ✅');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-rail rounded-2xl p-5 space-y-4">
      <h3 className="font-display font-bold text-lg">Make a bid</h3>

      <div>
        <label className="text-xs text-ink-muted uppercase tracking-wider block mb-2">
          Your journey
        </label>
        <select
          value={selectedJourneyId}
          onChange={(e) => setSelectedJourneyId(e.target.value)}
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
        >
          <option value="">Select a journey...</option>
          {journeys.map((j) => (
            <option key={j.id} value={j.id}>
              {j.from_station} → {j.to_station} ({new Date(j.departure_at).toLocaleString('en-GB')})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-ink-muted uppercase tracking-wider block mb-2">
          Your bid (£)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-ink-muted">£</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="25"
            className="w-full border border-rail rounded-xl px-4 py-3 pl-7 outline-none focus:border-accent-mid"
          />
        </div>
        <p className="text-xs text-ink-soft mt-1">
          Bid any amount. The sender will choose the best offer.
        </p>
      </div>

      <button
        type="submit"
        disabled={!selectedJourneyId || !amount || submitting}
        className="w-full bg-accent text-white rounded-full px-5 py-4 sm:py-3 font-medium hover:bg-ink transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] sm:min-h-auto"
      >
        {submitting ? (
          <>
            <LoadingSpinner size="sm" inline />
            Submitting...
          </>
        ) : (
          'Submit bid'
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3">
          <p className="text-sm font-medium text-red-700">{error.message}</p>
          {error.hint && <p className="text-xs text-red-600 mt-1">{error.hint}</p>}
        </div>
      )}
    </form>
  );
}
