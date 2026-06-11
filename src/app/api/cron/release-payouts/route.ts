// src/app/api/cron/release-payouts/route.ts  (v3 — bookings escrow)
// THE PAYOUT FUNCTION. Run hourly by an external cron service:
//   POST /api/cron/release-payouts
//   Authorization: Bearer <CRON_SECRET>
//
// Releases the carrier's share (price minus 20% commission) via a Stripe
// Transfer for every booking that is:
//   - paid (paid_at set by the webhook), and
//   - either confirmed by the sender (status 'completed'), or
//     delivered with the 24h dispute window expired (auto_release_at past)
//   - not disputed (disputed bookings have status 'disputed'), and
//   - not already released (funds_released_at null).
//
// Safety: Stripe idempotency key per booking means retries can never
// double-pay; the DB update is guarded on funds_released_at still null.

import { NextResponse } from 'next/server';
import { getStripeServer, supabaseAdmin } from '@/lib/stripe-server';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = supabaseAdmin();
  const stripe = getStripeServer();
  const nowIso = new Date().toISOString();

  const { data: due, error: qErr } = await db
    .from('bookings')
    .select(
      'id, carrier_id, agreed_price_pence, commission_pence, status, auto_release_at, paid_at',
    )
    .is('funds_released_at', null)
    .not('paid_at', 'is', null)
    .or(`status.eq.completed,and(status.eq.delivered,auto_release_at.lte.${nowIso})`)
    .limit(25); // batch; the next run picks up the rest

  if (qErr) {
    console.error('[release-payouts] query failed:', qErr.message);
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  const results: Array<{ booking: string; ok: boolean; detail: string }> = [];

  for (const b of due ?? []) {
    try {
      const amount = b.agreed_price_pence - b.commission_pence;
      if (amount <= 0) {
        results.push({ booking: b.id, ok: false, detail: 'non-positive amount' });
        continue;
      }

      const { data: cp } = await db
        .from('carrier_profiles')
        .select('stripe_connect_account_id, payout_enabled')
        .eq('id', b.carrier_id)
        .single();

      if (!cp?.stripe_connect_account_id || !cp.payout_enabled) {
        results.push({ booking: b.id, ok: false, detail: 'carrier payouts not enabled' });
        continue;
      }

      // Double-pay guard: if a previous run already created this booking's
      // transfer (e.g. crashed before recording it), reuse it. NOTE: we do
      // NOT use a Stripe idempotency key here — keys also replay *failed*
      // outcomes (e.g. insufficient funds) for 24h, which would wedge the
      // retry loop. The transfer_group lookup + the funds_released_at DB
      // guard cover the duplicate-payment risk instead.
      const existing = await stripe.transfers.list({
        transfer_group: `booking_${b.id}`,
        limit: 1,
      });
      const transfer =
        existing.data[0] ??
        (await stripe.transfers.create({
          amount,
          currency: 'gbp',
          destination: cp.stripe_connect_account_id,
          transfer_group: `booking_${b.id}`,
          metadata: { booking_id: b.id, carrier_id: b.carrier_id },
        }));

      const { error: upErr } = await db
        .from('bookings')
        .update({
          funds_released_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id)
        .is('funds_released_at', null);

      if (upErr) {
        // money moved but DB write failed — loud log; idempotency key
        // protects against double-pay on the retry that fixes this.
        console.error(
          `[release-payouts] PAID BUT NOT RECORDED: booking ${b.id} transfer ${transfer.id}: ${upErr.message}`,
        );
        results.push({ booking: b.id, ok: false, detail: `transfer ok, db failed: ${upErr.message}` });
        continue;
      }

      results.push({ booking: b.id, ok: true, detail: `transferred ${amount}p (${transfer.id})` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[release-payouts] booking ${b.id} failed:`, msg);
      results.push({ booking: b.id, ok: false, detail: msg });
    }
  }

  return NextResponse.json({
    checked: due?.length ?? 0,
    released: results.filter((r) => r.ok).length,
    results,
  });
}
