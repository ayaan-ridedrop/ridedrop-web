'use client';

import { useState } from 'react';
import { cancelJob } from '@/lib/actions/cancel-job';

export default function CancelJobButton({ jobId }: { jobId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    setDeleting(true);
    setError(null);

    try {
      await cancelJob(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
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
        {deleting ? 'Cancelling…' : 'Cancel job'}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </>
  );
}
