'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createCheckoutSession } from '@/lib/actions/create-checkout-session';

export default function PayButton({
  bookingId,
  priceGbp,
}: {
  bookingId: string;
  priceGbp: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mockPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient() as any;
      console.log('Updating booking with mock payment...');
      console.log('BookingId:', bookingId);

      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);

      const { data, error: err } = await supabase
        .from('bookings')
        .update({ stripe_payment_intent_id: `mock_${Date.now()}` })
        .eq('id', bookingId);

      console.log('Update result:', { data, error: err });

      if (err) {
        console.error('Payment update failed:', err);
        setSubmitting(false);
        setError(`Failed: ${err.message}`);
        return;
      }

      console.log('Payment update successful, refreshing...');
      // Wait a moment then refresh to show updated state
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.refresh();
    } catch (e) {
      console.error('Mock payment error:', e);
      setError(String(e));
      setSubmitting(false);
    }
  }

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
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-accent text-white rounded-full px-7 py-3 font-medium hover:bg-ink transition disabled:opacity-50"
        >
          {submitting ? 'Redirecting…' : `Pay £${priceGbp.toFixed(2)} →`}
        </button>
        <button
          type="button"
          onClick={mockPayment}
          disabled={submitting}
          className="px-4 py-3 text-sm border border-rail rounded-full hover:border-accent transition disabled:opacity-50"
        >
          Test
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  );
}
