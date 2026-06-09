'use client';

// src/components/DisputeButton.tsx
// Sender-side: raise a dispute on a delivered job within the 24h window.
// Drop into the sender's job detail page when job.status === 'delivered':
//   <DisputeButton jobId={job.id} />

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DisputeButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 10) {
      setError('Tell us a bit more about what went wrong (10+ characters).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: tx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('job_id', jobId)
        .maybeSingle();

      const { error: dErr } = await supabase.from('disputes').insert({
        job_id: jobId,
        transaction_id: tx?.id ?? null,
        raised_by: user.id,
        reason: reason.trim(),
      });
      if (dErr) throw dErr;

      if (tx && (tx.status === 'held' || tx.status === 'released')) {
        await supabase
          .from('transactions')
          .update({ status: 'disputed' })
          .eq('id', tx.id);
      }
      await supabase.from('jobs').update({ status: 'disputed' }).eq('id', jobId);

      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not raise dispute.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Dispute raised. Payment is on hold while we review — we'll be in touch.
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
          disabled={busy}
        >
          {busy ? 'Submitting…' : 'Raise dispute'}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
