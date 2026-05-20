'use client';

import { useState } from 'react';
import { cancelJourney } from '@/lib/actions/cancel-journey';

export default function CancelJourneyButton({ journeyId }: { journeyId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);

    try {
      await cancelJourney(journeyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel journey');
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={deleting}
        className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
      >
        {deleting ? 'Cancelling…' : 'Cancel journey'}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </>
  );
}
