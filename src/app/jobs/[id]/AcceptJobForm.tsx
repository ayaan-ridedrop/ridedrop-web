'use client';

import { useState } from 'react';
import { acceptJob } from '@/lib/actions/accept-job';

interface JourneyOption {
  id: string;
  label: string;
  minPriceGbp: number;
  slotsRemaining: number;
}

export default function AcceptJobForm({
  jobId,
  maxBudgetGbp,
  commissionPct,
  journeys,
}: {
  jobId: string;
  maxBudgetGbp: number;
  commissionPct: number;
  journeys: JourneyOption[];
}) {
  const [chosen, setChosen] = useState<JourneyOption>(journeys[0]);
  const [price, setPrice] = useState<number>(
    Math.min(maxBudgetGbp, Math.max(chosen.minPriceGbp, maxBudgetGbp)),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const carrierKeeps = price * (1 - commissionPct / 100);

  return (
    <form
      action={async (fd) => {
        setSubmitting(true);
        setError(null);
        const res = await acceptJob(fd);
        // On success, acceptJob redirects, so we never reach here.
        if (res && 'error' in res) {
          setError(res.error ?? null);
          setSubmitting(false);
        }
      }}
      className="bg-white border border-rail rounded-2xl p-6 space-y-5"
    >
      <input type="hidden" name="jobId" value={jobId} />

      <div>
        <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
          Which of your journeys?
        </div>
        <div className="space-y-2">
          {journeys.map((j) => (
            <label
              key={j.id}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${
                chosen.id === j.id ? 'border-accent bg-accent-light/30' : 'border-rail'
              }`}
            >
              <input
                type="radio"
                name="journeyId"
                value={j.id}
                checked={chosen.id === j.id}
                onChange={() => setChosen(j)}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{j.label}</div>
                <div className="text-xs text-ink-muted">
                  Your min: £{j.minPriceGbp.toFixed(2)} · {j.slotsRemaining} slot
                  {j.slotsRemaining === 1 ? '' : 's'} left
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
          Price (£)
        </div>
        <input
          name="agreedPriceGbp"
          type="number"
          min={chosen.minPriceGbp}
          max={maxBudgetGbp}
          step="0.5"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
        />
        <div className="text-xs text-ink-muted mt-1">
          Your min £{chosen.minPriceGbp.toFixed(2)} · Sender max £{maxBudgetGbp.toFixed(2)}
        </div>
      </div>

      <div className="bg-accent-light/40 border border-accent-light rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm">After {commissionPct}% commission, you'd keep</span>
        <span className="font-display font-extrabold text-accent text-xl">
          £{carrierKeeps.toFixed(2)}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-ink text-white rounded-full px-7 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 w-full"
      >
        {submitting ? 'Accepting…' : `Accept this job for £${price.toFixed(2)} →`}
      </button>
    </form>
  );
}
