'use client';

import { useState } from 'react';
import { confirmDelivery } from '@/lib/actions/confirm-delivery';

export default function ConfirmDeliveryButton({
  bookingId,
  autoReleaseAt,
}: {
  bookingId: string;
  autoReleaseAt: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append('bookingId', bookingId);
    const res = await confirmDelivery(fd);
    setSubmitting(false);
    if (res && 'error' in res) setError(res.error ?? null);
  }

  return (
    <div className="bg-white border border-rail rounded-2xl p-5">
      <h3 className="font-display font-bold text-lg mb-1">
        Did your package arrive safely?
      </h3>
      <p className="text-sm text-ink-soft font-light mb-4">
        Confirm delivery to release payment to the carrier.
        {autoReleaseAt && (
          <>
            {' '}Otherwise funds auto-release on{' '}
            {new Date(autoReleaseAt).toLocaleString('en-GB')}.
          </>
        )}
      </p>
      <button
        type="button"
        onClick={go}
        disabled={submitting}
        className="bg-accent text-white rounded-full px-7 py-3 font-medium hover:bg-ink transition disabled:opacity-50"
      >
        {submitting ? 'Confirming…' : '✓ Confirm delivery & release funds'}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
