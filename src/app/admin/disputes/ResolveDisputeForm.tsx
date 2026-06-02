'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<'resolved' | 'rejected'>('resolved');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient() as any;

    const { error: err } = await supabase
      .from('disputes')
      .update({
        status: resolution,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            value="resolved"
            checked={resolution === 'resolved'}
            onChange={(e) => setResolution(e.target.value as 'resolved' | 'rejected')}
            disabled={submitting}
          />
          <span>Resolved in favor</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            value="rejected"
            checked={resolution === 'rejected'}
            onChange={(e) => setResolution(e.target.value as 'resolved' | 'rejected')}
            disabled={submitting}
          />
          <span>Dispute rejected</span>
        </label>
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes (optional)"
        disabled={submitting}
        className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-mid disabled:opacity-50"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent transition disabled:opacity-50"
      >
        {submitting ? 'Resolving…' : 'Resolve dispute'}
      </button>
    </form>
  );
}
