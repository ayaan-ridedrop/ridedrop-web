'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BookingRealtime({
  bookingId,
  children,
}: {
  bookingId: string;
  children: (isPaid: boolean) => React.ReactNode;
}) {
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient() as any;

    // Initial fetch
    async function fetchPaymentStatus() {
      const { data } = await supabase
        .from('bookings')
        .select('stripe_payment_intent_id')
        .eq('id', bookingId)
        .single();
      setIsPaid(!!data?.stripe_payment_intent_id);
      setLoading(false);
    }

    fetchPaymentStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload: any) => {
          setIsPaid(!!payload.new.stripe_payment_intent_id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  if (loading) return null;
  return <>{children(isPaid)}</>;
}
