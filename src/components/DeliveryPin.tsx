'use client';

// src/components/DeliveryPin.tsx
// Sender-side: generate + reveal the delivery PIN once a bid is accepted.
// Drop this into the sender's job detail page:
//   <DeliveryPin jobId={job.id} />
// The PIN is returned in plaintext EXACTLY ONCE by the RPC; only a hash
// is stored. Tell the sender to pass it to the recipient (not the carrier).

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DeliveryPin({ jobId }: { jobId: string }) {
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_delivery_pin', {
        p_job_id: jobId,
      });
      if (rpcErr) throw rpcErr;
      setPin(data as string);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate PIN.');
    } finally {
      setBusy(false);
    }
  }

  if (pin) {
    return (
      <div className="rounded-xl border border-neutral-200 p-4 text-center">
        <p className="text-sm text-neutral-600">Delivery PIN — share with the recipient</p>
        <p className="mt-2 text-4xl font-bold tracking-[0.3em]">{pin}</p>
        <p className="mt-2 text-xs text-neutral-500">
          Save this now — it won't be shown again. The carrier needs it from
          the recipient to complete delivery and get paid.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={generate}
        disabled={busy}
        className="w-full rounded-lg bg-neutral-900 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Generating…' : 'Generate delivery PIN'}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
