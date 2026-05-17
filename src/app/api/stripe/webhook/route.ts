// Stripe webhook receiver.
//
// In dev: forward Stripe events to this URL with the Stripe CLI:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
//   (paste the printed `whsec_...` into STRIPE_WEBHOOK_SECRET in .env.local)
//
// Handles (so far):
//   - checkout.session.completed       → store payment_intent_id on booking
//   - payment_intent.succeeded         → idempotent backstop for the above
//   - charge.refunded                  → mark booking refunded
//
// Future, once Connect is approved (see docs/stripe-setup.md):
//   - account.updated                  → carrier onboarding state
//   - identity.verification_session.verified → flip id_verification_status
//   - transfer.created                 → payout queued

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs'; // Stripe SDK requires Node, not Edge.

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    // 200 so Stripe doesn't retry while you're still wiring this up.
    return NextResponse.json({ ok: true, note: 'webhook not configured yet' });
  }

  const body = await req.text();
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('[stripe webhook] bad signature:', err);
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const bookingId = session.metadata?.booking_id;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        if (bookingId && paymentIntentId) {
          await supabase
            .from('bookings')
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq('id', bookingId);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        // Backstop in case checkout.session.completed didn't fire (rare).
        const pi = event.data.object as any;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ stripe_payment_intent_id: pi.id })
            .eq('id', bookingId)
            .is('stripe_payment_intent_id', null);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as any;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (paymentIntentId) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('stripe_payment_intent_id', paymentIntentId);
        }
        break;
      }
      default:
        // Other events we don't care about yet.
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] handler failed:', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
