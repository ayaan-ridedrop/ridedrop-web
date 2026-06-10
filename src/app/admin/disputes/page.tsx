'use client';

// src/app/admin/disputes/page.tsx  (v3 — bookings)
// Manual dispute review. Requires the two admin UPDATE policies from the
// migration (uncomment + add your auth UUID) for the buttons to work.
// NOTE: refunds still execute in the Stripe dashboard for now (test mode:
// Payments → select → Refund). This page records the DECISION; the money
// side is manual until volume justifies automating it.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatGBP } from '@/lib/payments';

const ADMIN_IDS: string[] = [
  'b5bf56d3-f41e-45fc-a04b-90a937dc12be',
];

interface BookingLite {
  id: string;
  agreed_price_pence: number;
  commission_pence: number;
  job_id: string;
  status: string;
}

interface DisputeRow {
  id: string;
  booking_id: string;
  reason: string;
  created_at: string;
  bookings: BookingLite | null;
}

export default function DisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMe(user?.id ?? null);
      const { data, error: qErr } = await supabase
        .from('disputes')
        .select('id, booking_id, reason, created_at, bookings(id, agreed_price_pence, commission_pence, job_id, status)')
        .eq('status', 'open')
        .order('created_at', { ascending: true });
      if (qErr) setError(qErr.message);
      else setRows((data as unknown as DisputeRow[]) ?? []);
    })();
  }, []);

  async function resolve(d: DisputeRow, outcome: 'released' | 'refunded') {
    setBusyId(d.id);
    setError(null);
    try {
      if (outcome === 'released') {
        // put it back on the auto-release track (timer picks it up next run)
        const { error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'delivered', auto_release_at: new Date().toISOString() })
          .eq('id', d.booking_id);
        if (bErr) throw bErr;
      } else {
        const { error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', d.booking_id);
        if (bErr) throw bErr;
        alert(
          'Decision recorded. Now issue the actual refund in the Stripe dashboard: Payments → find the payment → Refund.',
        );
      }

      const { error: dErr } = await supabase
        .from('disputes')
        .update({ status: outcome, resolved_at: new Date().toISOString() })
        .eq('id', d.id);
      if (dErr) throw dErr;

      setRows((r) => r.filter((x) => x.id !== d.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resolve dispute.');
    } finally {
      setBusyId(null);
    }
  }

  if (me && ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(me)) {
    return <main className="p-8">Not authorised.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Open disputes</h1>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {rows.length === 0 && <p className="mt-6 text-neutral-500">No open disputes. 🎉</p>}
      <ul className="mt-6 space-y-4">
        {rows.map((d) => (
          <li key={d.id} className="rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">
                  Booking {d.booking_id.slice(0, 8)} ·{' '}
                  {new Date(d.created_at).toLocaleString('en-GB')}
                </p>
                <p className="mt-1">{d.reason}</p>
                {d.bookings && (
                  <p className="mt-1 text-sm text-neutral-600">
                    In escrow: {formatGBP(d.bookings.agreed_price_pence)} (carrier gets{' '}
                    {formatGBP(d.bookings.agreed_price_pence - d.bookings.commission_pence)})
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={() => resolve(d, 'released')}
                  disabled={busyId === d.id}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Release to carrier
                </button>
                <button
                  onClick={() => resolve(d, 'refunded')}
                  disabled={busyId === d.id}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Refund sender
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
