'use client';

// src/components/PaymentForm.tsx
// Sender-side escrow payment form.
// Usage on the job page (status bid_accepted):
//   <PaymentForm jobId={job.id} amountPence={Math.round(job.agreed_price * 100)} />
//
// Requires: npm i @stripe/stripe-js @stripe/react-stripe-js
// Env var:  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

import { useEffect, useState } from 'react';
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
  jobId,
  amountPence,
}: {
  jobId: string;
  amountPence: number;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not start payment');
        setClientSecret(data.clientSecret);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not start payment');
      }
    })();
  }, [jobId]);

  if (error)
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!clientSecret)
    return <p className="text-sm text-neutral-500">Loading payment…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutInner jobId={jobId} amountPence={amountPence} />
    </Elements>
  );
}

function CheckoutInner({ jobId, amountPence }: { jobId: string; amountPence: number }) {
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
        return_url: `${window.location.origin}/jobs/${jobId}?paid=1`,
      },
    });

    // only reached on immediate failure — success redirects to return_url
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
        Held securely until delivery is confirmed with the recipient's PIN.
        Released to the carrier 24 hours after delivery.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
