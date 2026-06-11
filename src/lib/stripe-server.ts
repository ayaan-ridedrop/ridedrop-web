// src/lib/stripe-server.ts
// Server-only clients. NEVER import this from a client component.

import 'server-only';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy singleton — instantiating Stripe at module load crashes the BUILD
// on hosts where STRIPE_SECRET_KEY isn't set (Next.js imports every route
// during "collecting page data"). Connect on first use instead.
let _stripe: Stripe | undefined;
export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, {
      apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

/** Service-role Supabase client — bypasses RLS. Server routes only. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
