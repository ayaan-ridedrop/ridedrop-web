// src/app/api/webhooks/stripe/route.ts
// Stripe webhook endpoint. Handles:
//   payment_intent.succeeded      → transaction pending → held, job → in_transit
//   payment_intent.payment_failed → logged (transaction stays pending, sender retries)
//   account.updated               → flips carrier stripe_onboarding_complete
//   charge.refunded               → safety net: marks transaction refunded
//
// Idempotency: every event id is inserted into stripe_events FIRST with a
// unique PK — a redelivered event hits the conflict and is skipped.
//
// Local testing:  stripe listen --forward-to localhost:3000/api/webhooks/stripe
// Production:     add endpoint in Stripe dashboard → copy signing secret
//                 to STRIPE_WEBHOOK_SECRET

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, supabaseAdmin } from '@/lib/stripe-server';
import { assertTransition } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text(); // raw body — do NOT json() before verifying
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ---- idempotency gate ----
  const { error: dupErr } = await db
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  if (dupErr) {
    // 23505 = unique_violation → already processed, ack and move on
    if (dupErr.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    console.error('stripe_events insert failed:', dupErr);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { data: tx } = await db
          .from('transactions')
          .select('id, status, job_id')
          .eq('stripe_payment_intent_id', pi.id)
          .maybeSingle();

        if (!tx) {
          // PI we don't know about — loud log, this should never happen
          console.error(`ORPHAN PAYMENT: PI ${pi.id} succeeded with no transaction row`);
          break;
        }
        if (tx.status === 'held') break; // already processed via another path

        assertTransition(tx.status, 'held');
        await db
          .from('transactions')
          .update({ status: 'held', held_at: new Date().toISOString() })
          .eq('id', tx.id)
          .eq('status', 'pending'); // optimistic-lock guard

        await db
          .from('jobs')
          .update({ status: 'in_transit' })
          .eq('id', tx.job_id)
          .eq('status', 'bid_accepted');
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment failed for PI ${pi.id}: ${pi.last_payment_error?.message}`);
        // transaction stays 'pending'; sender just retries the form
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const complete = !!account.details_submitted && !!account.payouts_enabled;
        await db
          .from('profiles')
          .update({ stripe_onboarding_complete: complete })
          .eq('stripe_account_id', account.id);
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
          .from('transactions')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            stripe_refund_id: charge.refunds?.data?.[0]?.id ?? null,
          })
          .eq('stripe_payment_intent_id', piId)
          .neq('status', 'paid_out'); // can't refund what's been paid out
        break;
      }

      default:
        // unhandled event types are fine — we only subscribed broadly in dev
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type} (${event.id}):`, err);
    // Remove the idempotency row so Stripe's retry actually re-processes
    await db.from('stripe_events').delete().eq('id', event.id);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
