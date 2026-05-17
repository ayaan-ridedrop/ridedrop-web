// Server Action — the sender pays for an accepted booking via Stripe
// Checkout (test mode). On success, the user is redirected back to the
// booking page and the webhook (api/stripe/webhook) records the
// payment_intent_id against the booking.
//
// TEST CARD: 4242 4242 4242 4242 · any future date · any 3-digit CVC.

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

const schema = z.object({ bookingId: z.string().uuid() });

export async function createCheckoutSession(formData: FormData) {
  const parsed = schema.safeParse({ bookingId: formData.get('bookingId') });
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, sender_id, status, agreed_price_pence,
      stripe_payment_intent_id,
      jobs!inner(from_station, to_station, package_description)
    `)
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  const b = booking as any;
  if (b.sender_id !== user.id) return { error: 'Only the sender pays' };
  if (b.status !== 'accepted') return { error: `Cannot pay while booking is ${b.status}` };
  if (b.stripe_payment_intent_id) return { error: 'Already paid' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Stripe not configured' };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: b.agreed_price_pence,
          product_data: {
            name: `RideDrop delivery: ${b.jobs.from_station} → ${b.jobs.to_station}`,
            description: b.jobs.package_description,
          },
        },
      },
    ],
    metadata: {
      booking_id: b.id,
      sender_id: b.sender_id,
    },
    success_url: `${baseUrl}/bookings/${b.id}?paid=1`,
    cancel_url: `${baseUrl}/bookings/${b.id}?cancelled=1`,
    // When Stripe Connect is approved, add:
    //   payment_intent_data: {
    //     application_fee_amount: Math.round(b.agreed_price_pence * 0.2),
    //     transfer_data: { destination: <carrier's connected account id> },
    //   }
  });

  if (!session.url) return { error: 'Could not create Stripe session' };
  redirect(session.url);
}
