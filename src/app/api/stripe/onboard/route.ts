// src/app/api/stripe/onboard/route.ts
// POST: carrier starts (or resumes) Stripe Express onboarding.
// Returns { url } — redirect the carrier there. Stripe sends them back
// to /dashboard?onboarding=complete (change below if you want).
//
// Wire-up: carrier dashboard shows a "Set up payouts" button when
// profile.stripe_onboarding_complete is false → POST here → window.location = url.

import { NextResponse } from 'next/server';
import { stripe, supabaseAdmin } from '@/lib/stripe-server';
import { getServerUser } from '@/lib/supabase-server';

export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();

  let accountId = profile?.stripe_account_id ?? null;

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
    await db.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id);
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
