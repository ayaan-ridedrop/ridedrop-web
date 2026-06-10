// netlify/functions/release-payments.mts  (v3 — bookings)
// Hourly: bookings delivered + auto_release_at passed + not yet released
// → Stripe transfer of (agreed_price_pence - commission_pence) to carrier
// → funds_released_at set, booking + job → completed.
//
// Env vars in Netlify: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY

import type { Config } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export default async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { data: due, error } = await supabase
    .from('bookings')
    .select('id, job_id, carrier_id, agreed_price_pence, commission_pence, stripe_transfer_id, paid_at')
    .eq('status', 'delivered')
    .is('funds_released_at', null)
    .lte('auto_release_at', new Date().toISOString());

  if (error) {
    console.error('release-payments query failed:', error.message);
    return new Response('query failed', { status: 500 });
  }

  let ok = 0;
  for (const b of due ?? []) {
    try {
      if (!b.paid_at) {
        console.error(`booking ${b.id}: delivered but never paid?! skipping — investigate`);
        continue;
      }

      // crash-recovery: transfer already made, just finish the bookkeeping
      if (b.stripe_transfer_id) {
        await markCompleted(supabase, b.id, b.job_id, b.stripe_transfer_id);
        ok++;
        continue;
      }

      const { data: cp } = await supabase
        .from('carrier_profiles')
        .select('stripe_connect_account_id')
        .eq('id', b.carrier_id)
        .single();

      if (!cp?.stripe_connect_account_id) {
        console.error(`booking ${b.id}: carrier has no Stripe account — skipping`);
        continue;
      }

      const carrierAmount = b.agreed_price_pence - b.commission_pence;
      if (carrierAmount <= 0) {
        console.error(`booking ${b.id}: carrier amount ${carrierAmount} invalid — skipping`);
        continue;
      }

      const transfer = await stripe.transfers.create(
        {
          amount: carrierAmount,
          currency: 'gbp',
          destination: cp.stripe_connect_account_id,
          transfer_group: `booking_${b.id}`,
          metadata: { booking_id: b.id, job_id: b.job_id },
        },
        { idempotencyKey: `transfer_${b.id}` }, // never double-pays
      );

      await markCompleted(supabase, b.id, b.job_id, transfer.id);
      ok++;
    } catch (e) {
      console.error(`failed to pay out booking ${b.id}:`, e);
      // retries next hour
    }
  }

  console.log(`release-payments: ${ok}/${due?.length ?? 0} paid out`);
  return new Response(`paid out ${ok}`);
};

async function markCompleted(
  supabase: SupabaseClient,
  bookingId: string,
  jobId: string,
  transferId: string,
) {
  await supabase
    .from('bookings')
    .update({
      stripe_transfer_id: transferId,
      funds_released_at: new Date().toISOString(),
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'delivered'); // guard: skip if disputed in the meantime

  await supabase
    .from('jobs')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'delivered');
}

export const config: Config = {
  schedule: '@hourly',
};
