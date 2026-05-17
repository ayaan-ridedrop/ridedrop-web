# Stripe integration plan

Read this **before** you start writing Stripe code. The order matters and
some of these steps require waiting for Stripe approval.

## Why two Stripe products

- **Stripe Connect** — for taking sender payments and paying out carriers,
  with RideDrop's 20% commission deducted automatically.
- **Stripe Identity** — for the carrier ID verification flow.

You need Connect approved before either is fully useful.

## Step 1 — Stripe Connect application (do this first, it's slow)

1. Create a Stripe account at stripe.com.
2. In the dashboard go to **Connect → Get started** and request platform
   access. Pick **Express** accounts (lowest onboarding friction for
   carriers) plus **Standard** as a fallback for power users.
3. Stripe will review RideDrop's business model. Provide:
   - Business description: peer-to-peer marketplace; UK rail couriers.
   - Link to the live landing page (so deploy it first).
   - The investor-services HTML doc covers the model nicely.
   - Confirm that carriers are independent contractors, not employees.
4. Stripe typically responds in **2–6 weeks**.

## Step 2 — While you wait (parallel)

You can write the entire integration in test mode without Connect
approval. Test-mode keys are issued instantly.

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  (issued when you create the webhook endpoint)
```

Install:

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Then uncomment the body of `src/lib/stripe.ts`.

## Step 3 — The escrow flow (per booking)

```
sender              RideDrop / Stripe                  carrier
  │                       │                            │
  │  accept job →         │                            │
  │  Stripe Checkout      │                            │
  │  pays £28 ─────────►  PaymentIntent captured       │
  │                       │  (transfer_data destination = carrier)
  │                       │  (application_fee_amount = 20%)
  │                       │                            │
  │                       │  funds held in RideDrop's     │
  │                       │  Connect platform balance  │
  │                       │                            │
  │  ... delivery happens ...                          │
  │  sender confirms      │                            │
  │  delivery ──────────► │  transfer ───────────────► carrier bank
  │                       │  (within 24h)              │
```

Use **Destination Charges** (the recommended pattern for Connect
marketplaces). Set `transfer_data[destination]` to the carrier's
connected account ID and `application_fee_amount` to the 20% in pence.
Hold the funds in the platform account until delivery is confirmed, then
release with `stripe.transfers.create()`.

For PINs and auto-release: when the carrier uploads the delivery photo,
set `auto_release_at = now() + interval '24 hours'`. A scheduled task
(Supabase Edge Function on a cron, or Vercel cron) releases any
bookings past their `auto_release_at`.

## Step 4 — Stripe Identity (after Connect is approved)

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # (or test)
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_...
```

Flow:

1. Carrier clicks "Verify ID" in profile.
2. Server creates a `VerificationSession`, returns the client_secret.
3. Carrier completes the modal in-browser (passport / driving licence + selfie).
4. Webhook `identity.verification_session.verified` fires.
5. Webhook handler updates `carrier_profiles.id_verification_status = 'verified'`.

Store the session ID on `carrier_profiles.stripe_identity_session_id`.

## Step 5 — Carrier onboarding (Connect Express)

Carriers click "Start carrying" → RideDrop redirects them to a Stripe-hosted
onboarding page → they enter their bank details → Stripe redirects back.

Store the resulting account ID on
`carrier_profiles.stripe_connect_account_id` and set
`payout_enabled = true` once `account.updated` reports
`details_submitted = true` and `charges_enabled = true`.

## Webhook setup

In the Stripe dashboard → **Developers → Webhooks → Add endpoint**:

- URL: `https://<your-domain>/api/stripe/webhook`
- Events to listen for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated`
  - `identity.verification_session.verified`
  - `transfer.created`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Test locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Files to fill in

- `src/lib/stripe.ts` — uncomment the real Stripe client.
- `src/app/api/stripe/webhook/route.ts` — implement the event handlers.
- `src/lib/actions/create-payment-intent.ts` — TODO, create when wiring
  the sender-pays step into the booking flow.
- `src/lib/actions/release-funds.ts` — TODO, called when the sender
  confirms delivery or the auto-release timer fires.
- `src/app/profile/page.tsx` — TODO, add the "Verify ID" and "Connect
  payouts" buttons that link to Stripe Identity / Connect onboarding.
