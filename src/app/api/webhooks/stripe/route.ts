/**
 * Stripe webhook handler for RideDrop
 * Receives events from Stripe and updates transaction state
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createTransaction } from '@/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Store processed webhook event IDs to prevent duplicate processing
 * In production, use a database table for this
 */
const processedEvents = new Set<string>();

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature || '', webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Idempotency: skip if we've already processed this event
  if (processedEvents.has(event.id)) {
    console.log('[stripe webhook] skipping duplicate event:', event.id);
    return NextResponse.json({ received: true });
  }

  try {
    // Store event in database (for audit trail)
    await storeWebhookEvent(event);
    processedEvents.add(event.id);

    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event as Stripe.Event);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event as Stripe.Event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event as Stripe.Event);
        break;

      default:
        console.log(`[stripe webhook] unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] error processing event:', err);
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle payment_intent.succeeded
 * Create transaction and mark as 'held' (awaiting PIN)
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  console.log('[stripe webhook] payment_intent.succeeded:', paymentIntent.id);

  // Extract metadata (you'll pass this when creating the payment intent)
  const jobId = paymentIntent.metadata?.job_id;
  const senderId = paymentIntent.metadata?.sender_id;
  const carrierId = paymentIntent.metadata?.carrier_id;

  if (!jobId || !senderId || !carrierId) {
    throw new Error(
      `Missing metadata on payment intent ${paymentIntent.id}`
    );
  }

  await createTransaction({
    job_id: jobId,
    sender_id: senderId,
    carrier_id: carrierId,
    amount_pence: paymentIntent.amount,
    stripe_payment_intent_id: paymentIntent.id,
  });

  console.log(
    `[stripe webhook] created transaction for job ${jobId}, amount ${paymentIntent.amount / 100} GBP`
  );
}

/**
 * Handle charge.refunded
 * Mark transaction as refunded
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  console.log('[stripe webhook] charge.refunded:', charge.id);

  // Find transaction by payment intent ID
  const supabase = createClient();
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select()
    .eq('stripe_payment_intent_id', charge.payment_intent)
    .single();

  if (error) {
    console.error('[stripe webhook] could not find transaction:', error);
    throw error;
  }

  await supabase
    .from('transactions')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      notes: `Refunded via Stripe charge ${charge.id}`,
    })
    .eq('id', transaction.id);

  console.log(
    `[stripe webhook] marked transaction ${transaction.id} as refunded`
  );
}

/**
 * Handle payment_intent.payment_failed
 * Mark transaction as failed (stay in pending or create failed state)
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  console.log('[stripe webhook] payment_intent.payment_failed:', paymentIntent.id);

  // Find and update transaction
  const supabase = createClient();
  const { data: transaction } = await supabase
    .from('transactions')
    .select()
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (transaction) {
    await supabase
      .from('transactions')
      .update({
        notes: `Payment failed: ${paymentIntent.last_payment_error?.message}`,
      })
      .eq('id', transaction.id);
  }

  // TODO: Notify sender that payment failed
}

/**
 * Store webhook event in database for audit trail
 */
async function storeWebhookEvent(event: Stripe.Event) {
  const supabase = createClient();

  // TODO: Create a stripe_webhook_events table to store these
  // For now, just log
  console.log('[stripe webhook] storing event:', event.type, event.id);
}
