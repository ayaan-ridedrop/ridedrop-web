'use client';

// src/components/PaymentForm.tsx  (v3 — bookings)
// Sender escrow payment for an accepted booking.
//   <PaymentForm bookingId={booking.id} amountPence={booking.agreed_price_pence} />
// Requires: npm i @stripe/stripe-js @stripe/react-stripe-js

import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { formatGBP } from '@/lib/payments';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentForm({
  bookingId,
  amountPence,
}: {
  bookingId: string;
  amountPence: number;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // React StrictMode (dev) runs effects twice — without this guard the
  // endpoint gets called twice and creates two PaymentIntents, and the
  // user can end up paying one the booking doesn't reference.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    (async () => {
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: bookingId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not start payment');
        setClientSecret(data.clientSecret);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not start payment');
      }
    })();
  }, [bookingId]);

  if (error)
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!clientSecret)
    return <p className="text-sm text-neutral-500">Loading payment…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutInner bookingId={bookingId} amountPence={amountPence} />
    </Elements>
  );
}

function CheckoutInner({
  bookingId,
  amountPence,
}: {
  bookingId: string;
  amountPence: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: payErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${bookingId}?paid=1`,
      },
    });

    if (payErr) setError(payErr.message ?? 'Payment failed. Try again.');
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        onClick={pay}
        disabled={busy || !stripe}
        className="w-full rounded-lg bg-neutral-900 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Processing…' : `Pay ${formatGBP(amountPence)} into escrow`}
      </button>
      <p className="text-xs text-neutral-500">
        Held securely until delivery is confirmed with the recipient's PIN. Released to the
        carrier 24 hours after delivery.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
