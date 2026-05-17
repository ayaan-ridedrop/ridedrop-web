'use client';

import { useState } from 'react';
import { createCheckoutSession } from '@/lib/actions/create-checkout-session';

export default function PayButton({
  bookingId,
  priceGbp,
}: {
  bookingId: string;
  priceGbp: number;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (fd) => {
        setSubmitting(true);
        setError(null);
        const res = await createCheckoutSession(fd);
        // On success, createCheckoutSession redirects to Stripe.
        if (res && 'error' in res) {
          setError(res.error ?? null);
          setSubmitting(false);
        }
      }}
      className="bg-white border border-rail rounded-2xl p-5"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <h3 className="font-display font-bold text-lg mb-1">
        Pay £{priceGbp.toFixed(2)} to confirm
      </h3>
      <p className="text-sm text-ink-soft font-light mb-4">
        Your payment is held in escrow. The carrier is only paid once you
        confirm delivery. Test card:{' '}
        <code className="bg-cream px-1.5 py-0.5 rounded">4242 4242 4242 4242</code>.
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="bg-accent text-white rounded-full px-7 py-3 font-medium hover:bg-ink transition disabled:opacity-50 w-full"
      >
        {submitting ? 'Redirecting to Stripe…' : `Pay £${priceGbp.toFixed(2)} →`}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  );
}
