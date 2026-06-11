// src/app/api/webhooks/stripe/route.ts  (v3 — bookings)
// payment_intent.succeeded      → booking paid_at set (escrow live)
// payment_intent.payment_failed → logged; sender retries
// account.updated               → carrier_profiles.payout_enabled
// charge.refunded               → booking refunded_at + refund id
//
// Local:  stripe listen --forward-to localhost:3000/api/webhooks/stripe
// Prod:   dashboard webhook endpoint → STRIPE_WEBHOOK_SECRET

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, supabaseAdmin } from '@/lib/stripe-server';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // idempotency gate
  const { error: dupErr } = await db
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === '23505')
      return NextResponse.json({ received: true, duplicate: true });
    console.error('stripe_events insert failed:', dupErr);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        let { data: b } = await db
          .from('bookings')
          .select('id, paid_at')
          .eq('stripe_payment_intent_id', pi.id)
          .maybeSingle();

        // Safety net: every PI we create carries booking_id in metadata.
        // If the stored id doesn't match (e.g. a duplicate create-intent
        // call overwrote it before this payment landed), recover the
        // booking from metadata and re-point it at the PI that was
        // actually paid.
        if (!b && pi.metadata?.booking_id) {
          const { data: byMeta } = await db
            .from('bookings')
            .select('id, paid_at')
            .eq('id', pi.metadata.booking_id)
            .maybeSingle();
          if (byMeta && !byMeta.paid_at) {
            await db
              .from('bookings')
              .update({
                stripe_payment_intent_id: pi.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', byMeta.id)
              .is('paid_at', null);
          }
          b = byMeta;
        }

        if (!b) {
          console.error(`ORPHAN PAYMENT: PI ${pi.id} succeeded with no booking`);
          break;
        }
        if (b.paid_at) break; // already recorded (e.g. double payment — refund manually in Stripe)

        await db
          .from('bookings')
          .update({ paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', b.id)
          .is('paid_at', null);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment failed for PI ${pi.id}: ${pi.last_payment_error?.message}`);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const enabled = !!account.details_submitted && !!account.payouts_enabled;
        await db
          .from('carrier_profiles')
          .update({ payout_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('stripe_connect_account_id', account.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!piId) break;
        await db
          .from('bookings')
          .update({
            refunded_at: new Date().toISOString(),
            stripe_refund_id: charge.refunds?.data?.[0]?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', piId)
          .is('funds_released_at', null); // can't refund after payout
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type} (${event.id}):`, err);
    // release the idempotency lock so Stripe's retry re-processes
    await db.from('stripe_events').delete().eq('id', event.id);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
