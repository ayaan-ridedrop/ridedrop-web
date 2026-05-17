'use client';

import { useState } from 'react';
import { raiseDispute } from '@/lib/actions/raise-dispute';

const REASONS = [
  'Package never collected',
  'Package never delivered',
  'Package damaged',
  'Package contents wrong',
  'Carrier no-show',
  'Sender no-show',
  'Other',
];

export default function DisputeForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">
        Dispute raised. Funds are frozen while support investigates.
        We'll be in touch within 24 hours.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-700 underline"
      >
        Something's gone wrong → Raise a dispute
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append('bookingId', bookingId);
    fd.append('reason', reason);
    if (description.trim()) fd.append('description', description.trim());
    const res = await raiseDispute(fd);
    setSubmitting(false);
    if (res && 'error' in res) setError(res.error ?? null);
    else setDone(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-red-50 border border-red-200 rounded-2xl p-5"
    >
      <h3 className="font-display font-bold text-lg text-red-900 mb-1">
        Raise a dispute
      </h3>
      <p className="text-sm text-red-800 font-light mb-4">
        Raising a dispute freezes the booking and stops the auto-release of
        funds. RideDrop support will be in touch within 24 hours.
      </p>
      <label className="block text-xs text-red-900 uppercase tracking-wider font-medium mb-1.5">
        Reason
      </label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full border border-red-200 bg-white rounded-xl px-4 py-3 outline-none focus:border-red-500 mb-4"
      >
        {REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <label className="block text-xs text-red-900 uppercase tracking-wider font-medium mb-1.5">
        What happened?
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
        rows={4}
        placeholder="Describe what went wrong, with as much detail as possible."
        className="w-full border border-red-200 bg-white rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm"
      />
      <div className="text-xs text-red-700 mt-1">{description.length}/1000</div>
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-red-700 text-white rounded-full px-5 py-2.5 font-medium hover:bg-red-800 transition disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Raise dispute'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-red-900 px-4 py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
