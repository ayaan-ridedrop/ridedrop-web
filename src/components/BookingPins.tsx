'use client';

// src/components/BookingPins.tsx  (v3 — two-PIN flow)
// Sender-side: generate + reveal BOTH PINs once payment is confirmed.
// Render on the sender's booking page when status is 'accepted' and paid.
//   <BookingPins bookingId={booking.id} />
// PINs are returned in plaintext EXACTLY ONCE; only hashes are stored.

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyPinsGenerated } from '@/lib/actions/notify-booking-event';

export default function BookingPins({ bookingId }: { bookingId: string }) {
  const [pins, setPins] = useState<{ pickup_pin: string; delivery_pin: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_booking_pins', {
        p_booking_id: bookingId,
      });
      if (rpcErr) throw rpcErr;
      setPins(data as { pickup_pin: string; delivery_pin: string });
      // tell the carrier pickup is ready (fire-and-forget)
      notifyPinsGenerated(bookingId).catch(() => {});
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not generate PINs.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (pins) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-neutral-200 p-4 text-center">
          <p className="text-sm text-neutral-600">Pickup PIN — give to the carrier at pickup</p>
          <p className="mt-1 text-3xl font-bold tracking-[0.3em]">{pins.pickup_pin}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 text-center">
          <p className="text-sm text-neutral-600">
            Delivery PIN — send to the <strong>recipient</strong>, not the carrier
          </p>
          <p className="mt-1 text-3xl font-bold tracking-[0.3em]">{pins.delivery_pin}</p>
        </div>
        <p className="text-xs text-neutral-500">
          Save these now — they won't be shown again. The carrier needs the pickup PIN from you
          and the delivery PIN from your recipient to complete the job and get paid.
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
        {busy ? 'Generating…' : 'Generate handover PINs'}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
