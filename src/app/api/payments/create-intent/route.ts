// src/app/api/payments/create-intent/route.ts  (v3 — bookings)
// POST { booking_id } → escrow PaymentIntent for an accepted booking.
// Money model: separate charges & transfers — funds sit in the platform
// balance until 24h after confirmed delivery.

import { NextRequest, NextResponse } from 'next/server';
import { stripe, supabaseAdmin } from '@/lib/stripe-server';
import { getServerUser } from '@/lib/supabase-server';
import { splitAmount } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { booking_id } = await req.json();
  if (!booking_id)
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const db = supabaseAdmin();

  const { data: b, error: bErr } = await db
    .from('bookings')
    .select('id, job_id, sender_id, carrier_id, agreed_price_pence, status, paid_at, stripe_payment_intent_id')
    .eq('id', booking_id)
    .single();

  if (bErr || !b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (b.sender_id !== user.id)
    return NextResponse.json({ error: 'Only the sender can pay' }, { status: 403 });
  if (b.status !== 'accepted')
    return NextResponse.json({ error: `Booking not payable in status ${b.status}` }, { status: 409 });
  if (b.paid_at)
    return NextResponse.json({ error: 'Booking already paid' }, { status: 409 });

  // carrier must be able to receive payouts before money enters escrow
  const { data: cp } = await db
    .from('carrier_profiles')
    .select('stripe_connect_account_id, payout_enabled')
    .eq('id', b.carrier_id)
    .single();
  if (!cp?.stripe_connect_account_id || !cp.payout_enabled) {
    return NextResponse.json(
      { error: 'Carrier has not finished payout setup yet' },
      { status: 409 },
    );
  }

  const split = splitAmount(b.agreed_price_pence); // already pence ✔

  // reuse an existing unpaid intent (sender refreshed / retried)
  if (b.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
    if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
      return NextResponse.json({ clientSecret: pi.client_secret });
    }
  }

  const intent = await stripe.paymentIntents.create({
    amount: split.amount_total,
    currency: 'gbp',
    automatic_payment_methods: { enabled: true },
    transfer_group: `booking_${booking_id}`,
    metadata: {
      booking_id,
      job_id: b.job_id,
      sender_id: b.sender_id,
      carrier_id: b.carrier_id,
    },
  });

  const { error: upErr } = await db
    .from('bookings')
    .update({
      stripe_payment_intent_id: intent.id,
      commission_pence: split.amount_fee, // single source of truth for the 20%
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking_id);

  if (upErr) {
    await stripe.paymentIntents.cancel(intent.id).catch(() => {});
    return NextResponse.json({ error: 'Could not attach payment to booking' }, { status: 500 });
  }

  return NextResponse.json({ clientSecret: intent.client_secret });
}
