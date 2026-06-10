// src/lib/stripe-server.ts
// Server-only clients. NEVER import this from a client component.

import 'server-only';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
  typescript: true,
});

/** Service-role Supabase client — bypasses RLS. Server routes only. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
