'use client';

// Carrier clicks → /api/stripe/onboard creates (or resumes) their Stripe
// Express account and returns a one-time onboarding link → redirect.
// On return, Stripe's account.updated webhook flips payout_enabled.

import { useState } from 'react';

export default function OnboardPayoutsButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/onboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start payout setup');
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start payout setup');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={busy}
        className="bg-ink text-white rounded-full px-6 py-3 font-medium hover:bg-accent transition disabled:opacity-50"
      >
        {busy ? 'Opening Stripe…' : 'Set up payouts with Stripe →'}
      </button>
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
    </div>
  );
}
