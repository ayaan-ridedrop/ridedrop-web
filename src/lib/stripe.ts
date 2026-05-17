// Server-side Stripe client (singleton).
//
// ⚠️ For TEST MODE you only need `STRIPE_SECRET_KEY=sk_test_...` (free,
//    issued instantly at stripe.com → Developers → API keys).
// ⚠️ For LIVE MODE you need Stripe Connect approval first (2–6 weeks).
//
// To activate: `npm install stripe` then make sure your .env.local has
// `STRIPE_SECRET_KEY=sk_test_...`. If the key is missing, `getStripe()`
// throws a clear error instead of crashing at import time.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local — see docs/stripe-setup.md',
    );
  }
  _stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  return _stripe;
}
