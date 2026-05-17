'use client';

import { useState } from 'react';
import { resolveDispute } from '@/lib/actions/resolve-dispute';

export default function ResolveDisputeForm({
  disputeId,
  bookingId,
}: {
  disputeId: string;
  bookingId: string;
}) {
  const [resolution, setResolution] = useState<'refund_sender' | 'pay_carrier' | 'split'>(
    'refund_sender',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append('disputeId', disputeId);
    fd.append('bookingId', bookingId);
    fd.append('resolution', resolution);
    fd.append('notes', notes);
    const res = await resolveDispute(fd);
    setSubmitting(false);
    if (res && 'error' in res) setError(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['refund_sender', 'Refund sender'],
            ['pay_carrier', 'Pay carrier'],
            ['split', 'Split (50/50)'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setResolution(value)}
            className={`text-sm px-4 py-2 rounded-full border transition ${
              resolution === value
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-ink-soft border-rail'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
        placeholder="Resolution notes (visible internally)"
        rows={2}
        className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-accent text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-ink transition disabled:opacity-50"
      >
        {submitting ? 'Resolving…' : 'Resolve dispute'}
      </button>
    </form>
  );
}
