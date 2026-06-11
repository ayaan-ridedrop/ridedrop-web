// src/app/api/stripe/onboard/route.ts  (v3 — carrier_profiles)
// POST: carrier starts/resumes Stripe Express onboarding.

import { NextResponse } from 'next/server';
import { getStripeServer, supabaseAdmin } from '@/lib/stripe-server';
import { getServerUser } from '@/lib/supabase-server';

export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const stripe = getStripeServer();
  const db = supabaseAdmin();
  const { data: cp } = await db
    .from('carrier_profiles')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!cp) {
    return NextResponse.json(
      { error: 'No carrier profile — complete carrier signup first' },
      { status: 409 },
    );
  }

  let accountId = cp.stripe_connect_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_type: 'individual',
      metadata: { profile_id: user.id },
    });
    accountId = account.id;
    await db
      .from('carrier_profiles')
      .update({ stripe_connect_account_id: accountId, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}/dashboard?onboarding=refresh`,
    return_url: `${origin}/dashboard?onboarding=complete`,
  });

  return NextResponse.json({ url: link.url });
}
