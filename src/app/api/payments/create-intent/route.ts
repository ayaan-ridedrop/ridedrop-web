// src/app/api/payments/create-intent/route.ts
// POST { job_id } → creates the escrow PaymentIntent for an accepted job.
// Returns { clientSecret, transactionId } for the PaymentForm component.
//
// Escrow model: SEPARATE CHARGES AND TRANSFERS.
// Sender's money lands in YOUR platform balance and sits there. The
// transfer to the carrier's connected account only happens at payout
// time (release-payments function / dispute resolution). This is what
// makes the 24h dispute window real — nothing to claw back.
//
// ASSUMPTION: jobs table has an agreed price column in POUNDS called
// `agreed_price` (numeric). If yours is named differently (e.g. the
// accepted bid amount lives on a bids table), change the marked lines.

import { NextRequest, NextResponse } from 'next/server';
import { stripe, supabaseAdmin } from '@/lib/stripe-server';
import { getServerUser } from '@/lib/supabase-server';
import { splitAmount } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { job_id } = await req.json();
  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 });

  const db = supabaseAdmin();

  // --- load + validate the job ---
  const { data: job, error: jobErr } = await db
    .from('jobs')
    .select('id, sender_id, carrier_id, status, agreed_price') // ← rename if needed
    .eq('id', job_id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.sender_id !== user.id)
    return NextResponse.json({ error: 'Only the sender can pay' }, { status: 403 });
  if (job.status !== 'bid_accepted')
    return NextResponse.json({ error: `Job not payable in status ${job.status}` }, { status: 409 });
  if (!job.carrier_id)
    return NextResponse.json({ error: 'No carrier assigned' }, { status: 409 });

  // carrier must have completed payout onboarding before money enters escrow
  const { data: carrier } = await db
    .from('profiles')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', job.carrier_id)
    .single();
  if (!carrier?.stripe_account_id || !carrier.stripe_onboarding_complete) {
    return NextResponse.json(
      { error: 'Carrier has not finished payout setup yet' },
      { status: 409 },
    );
  }

  const amountPence = Math.round(Number(job.agreed_price) * 100); // ← rename if needed
  const split = splitAmount(amountPence);

  // --- idempotency: reuse an existing pending transaction ---
  const { data: existing } = await db
    .from('transactions')
    .select('id, status, stripe_payment_intent_id')
    .eq('job_id', job_id)
    .maybeSingle();

  if (existing && existing.status !== 'pending') {
    return NextResponse.json({ error: 'Job already paid' }, { status: 409 });
  }

  if (existing?.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id);
    if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
      return NextResponse.json({ clientSecret: pi.client_secret, transactionId: existing.id });
    }
  }

  // --- create PI (money goes to platform balance, transfer comes later) ---
  const intent = await stripe.paymentIntents.create({
    amount: split.amount_total,
    currency: 'gbp',
    automatic_payment_methods: { enabled: true },
    transfer_group: `job_${job_id}`,
    metadata: {
      job_id,
      sender_id: job.sender_id,
      carrier_id: job.carrier_id,
    },
  });

  const row = {
    job_id,
    sender_id: job.sender_id,
    carrier_id: job.carrier_id,
    ...split,
    currency: 'gbp',
    stripe_payment_intent_id: intent.id,
    status: 'pending' as const,
  };

  const { data: tx, error: txErr } = existing
    ? await db.from('transactions').update(row).eq('id', existing.id).select('id').single()
    : await db.from('transactions').insert(row).select('id').single();

  if (txErr) {
    // don't leave an orphan PI that could be paid with no ledger row
    await stripe.paymentIntents.cancel(intent.id).catch(() => {});
    return NextResponse.json({ error: 'Could not create transaction' }, { status: 500 });
  }

  return NextResponse.json({ clientSecret: intent.client_secret, transactionId: tx.id });
}
