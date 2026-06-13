'use client';

// src/components/DisputeButton.tsx  (v3 — bookings, via raise_dispute RPC + email)
// Sender-side, on the booking page when status === 'delivered':
//   <DisputeButton bookingId={booking.id} />

import { useState } from 'react';
import { raiseDisputeWithEmail } from '@/lib/actions/raise-dispute-with-email';

export default function DisputeButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await raiseDisputeWithEmail(bookingId, reason);
      if (result.error) {
        setError(result.error);
      } else if (result.ok) {
        setDone(true);
      } else {
        setError('Could not raise dispute.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not raise dispute.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Dispute raised. The payout is frozen while we review — we'll be in touch.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-700 underline"
      >
        Something wrong with this delivery?
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
      <p className="text-sm font-medium">What went wrong?</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm"
        placeholder="e.g. The parcel arrived damaged / never arrived…"
      />
      <div className="flex gap-3">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium"
          disabled={busy}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy || reason.trim().length < 10}
        >
          {busy ? 'Submitting…' : 'Raise dispute'}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
