# Deploying RideDrop

This is a step-by-step guide written for a non-technical founder. Total
time: about 30 minutes once you have a Supabase project and a domain.

---

## Prerequisites

Make sure you've already done these (from `LAUNCH-CHECKLIST.md` in the
parent folder):

- [ ] Created a Supabase project (note your URL + anon + service-role keys).
- [ ] Bought a domain.
- [ ] Created a Stripe account (`sk_test_...` and `pk_test_...` keys).
- [ ] (Optional) Created a Resend account (`re_...` key).

---

## Step 1 — Get the code onto GitHub (10 min)

If you've never used GitHub before, install **GitHub Desktop**
(desktop.github.com) — it's a friendly app that does git for you.

1. Open GitHub Desktop and sign in.
2. Click **File → Add Local Repository** and choose the `ridedrop-web` folder.
3. It'll ask "create a repository?" — say yes. Set it to **private** for
   now (you can flip to public later).
4. Click **Publish repository** (top right). You're done.

The repo is now on github.com under your account.

---

## Step 2 — Connect to Vercel (10 min)

1. Go to https://vercel.com and sign in with **your GitHub account** (so
   it can see your repo).
2. Click **Add New… → Project**.
3. Pick `ridedrop-web` from the list and click **Import**.
4. Vercel will auto-detect Next.js. Leave all the default build settings.
5. Expand **Environment Variables** and add these (copy values from your
   `.env.local`, or just from the relevant dashboards):

   | Name | Where to get it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
   | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (test mode) |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
   | `STRIPE_WEBHOOK_SECRET` | See "Step 4" below |
   | `RESEND_API_KEY` | (optional) resend.com |
   | `ADMIN_EMAILS` | your email — comma-separated for multiple |
   | `NEXT_PUBLIC_APP_URL` | leave blank for now; we'll set it in Step 3 |

6. Click **Deploy**. First build takes 2–3 minutes.

You'll get a temporary URL like `ridedrop-web-abc123.vercel.app`. Open it in
a browser — you should see the RideDrop landing page!

---

## Step 3 — Point your domain at Vercel (5 min)

1. In the Vercel project go to **Settings → Domains**.
2. Click **Add** and type your domain (e.g. `ridedrop.co.uk`). Hit Add.
3. Vercel will show you DNS records to set. Go to whoever you bought the
   domain from (Gandi, Namecheap, etc.) and add those records.
4. DNS propagates in a few minutes. Vercel will turn your domain green
   when it's live.
5. Back in **Settings → Environment Variables**, edit
   `NEXT_PUBLIC_APP_URL` and set it to `https://ridedrop.co.uk` (or whatever
   your domain is). Save.
6. Click **Deployments → ... → Redeploy** on the latest deployment so it
   picks up the new env var.

You're live!

---

## Step 4 — Stripe webhook (5 min)

For test-mode payments to actually update bookings, Stripe needs to send
events to your live URL.

1. In the Stripe dashboard go to **Developers → Webhooks → Add endpoint**.
2. URL: `https://ridedrop.co.uk/api/stripe/webhook` (replace with your domain).
3. **Events to send** — pick:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.refunded`
4. Click **Add endpoint**.
5. On the next page, click **Reveal signing secret** and copy the
   `whsec_...` value.
6. Back in Vercel → Settings → Environment Variables, set
   `STRIPE_WEBHOOK_SECRET` to that value. Redeploy.

---

## Step 5 — Update Supabase auth redirect URLs (2 min)

So that signup-confirmation emails redirect to the right place:

1. Supabase dashboard → **Authentication → URL Configuration**.
2. Set **Site URL** to `https://ridedrop.co.uk`.
3. Add `https://ridedrop.co.uk/**` to **Redirect URLs**.

---

## You're live

Test the whole flow on your live URL: signup → post a job → accept it →
pay with the test card `4242 4242 4242 4242` → handoff PINs → confirm
delivery → leave a review. End-to-end on a real public URL.

### From now on, deploying changes is automatic

Every time you (or a dev) push code to GitHub, Vercel builds and deploys
within ~2 minutes. No commands to run.

### Going to live Stripe (later)

When Stripe Connect is approved, swap the four `*_test_*` env vars to
their `*_live_*` equivalents in Vercel, and add the `transfer_data`
fields to `src/lib/actions/create-checkout-session.ts` (see
`docs/stripe-setup.md`). Redeploy. Live.
