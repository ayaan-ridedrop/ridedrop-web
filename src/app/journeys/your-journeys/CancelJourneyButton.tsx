'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CancelJourneyButton({ journeyId }: { journeyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    setLoading(true);
    setError(null);

    const supabase = createClient() as any;
    const { error: err } = await supabase
      .from('journeys')
      .update({ status: 'cancelled' })
      .eq('id', journeyId);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-sm bg-red-500 text-white rounded-full px-4 py-2 font-medium hover:bg-red-600 transition disabled:opacity-50"
      >
        {loading ? 'Cancelling…' : 'Cancel'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </>
  );
}
