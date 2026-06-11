# RideDrop — web app  ·  V1

Train-powered peer-to-peer parcel delivery across the UK.

This is the real codebase (Next.js + Supabase). The clickable HTML prototype
that exists alongside this folder (`../ridedrop-app.html`) is not used by this
project — treat it as design reference only.

**V1 status (as of this build):** every user-facing flow is implemented
end-to-end, including photo upload, real-time chat, PIN handoff, Stripe
test-mode payments, reviews, and disputes. Once you create a Supabase
project + Stripe test account, the app is fully demoable on localhost.

The only things missing are infra-side approvals you can't bypass with
code: Stripe Connect approval (for live carrier payouts), Stripe Identity
(for real ID verification), and the National Rail Darwin API (for real
train timetables). All three have stub flows in V1 so you can show the
full journey to investors/testers today.

---

## What this is and is not

**What's done in V1** ✅

Foundation:

- Next.js 14 App Router + TypeScript + Tailwind project structure.
- Supabase schema (`supabase/schema.sql`) — 9 tables, full RLS, helper
  view (`user_trust`) and function (`max_declared_value_pence`),
  triggers for PIN generation, slot decrement, job-status flip, review
  rating recomputation, and carrier stats roll-up.
- Storage policies (`supabase/storage.sql`) — two private buckets
  (`tickets`, `package-photos`) with participant-only access.
- Auth — signup, login, logout, route protection middleware.
- Typed Database shape + constants (`src/lib/types.ts`).

End-to-end user flows:

- Landing page with **real waitlist form** → `/api/waitlist`.
- Post a job, list a journey, browse jobs, browse journeys.
- **Accept a job** with price negotiation server-side.
- **Pay** for an accepted booking via **Stripe Checkout (test mode)**.
- **Pickup photo** upload with GPS captured at upload (`PhotoUpload`).
- **Pickup PIN** — sender reads, carrier verifies.
- **Real-time chat** between sender and carrier (Supabase Realtime).
- **Delivery photo** upload + GPS.
- **Delivery PIN** — recipient reads, carrier verifies.
- **Sender confirms delivery** → funds released (auto-releases at 24h).
- **Reviews** — both sides can leave 1–5 stars + written feedback.
- **Disputes** — one-tap, freezes funds, notifies support.
- **ID verification stub** — one-click flip for demo. Replace with real
  Stripe Identity flow (see `docs/stripe-setup.md`) before launch.
- **Notifications / activity feed** at `/notifications`.
- **Transactional emails** via Resend (test mode) — fires on accept,
  payment received, delivery confirmed, dispute.
- **Mobile-responsive** with native-feeling bottom tab bar on phones.

Demo data:

- `npm run seed` creates 4 demo users, 2 listed journeys, 2 open jobs.

**What's NOT done — and won't be done in code, because they're external** ❌

1. **Stripe Connect approval** for live carrier payouts. Test-mode
   payments work today; live mode requires Stripe approval (2–6 weeks).
   See `docs/stripe-setup.md`.
2. **Stripe Identity** for real ID verification. Stub flow is in place;
   real wire-up needs Connect first.
3. **National Rail Darwin API** for live train timetables. App accepts
   free-text departure/arrival times for now.
4. **OCR ticket verification.** Manual ticket review for V1; OCR is
   Phase 2 per the investor doc.
5. **Push notifications.** Email-first for V1.
6. **Live privacy + T&C copy.** Placeholder pages exist with prominent
   "needs UK lawyer" warnings. The two T&C drafts in the parent folder
   (`RideDrop_Terms_and_Conditions_v1.docx`, `..._v2.docx`) are the
   starting point.
7. **Counter-offer flow.** Current build lets carriers accept at any
   price between their minimum and the sender's max — covers the V1
   use case. Counter-offers were defer to Phase 2.
8. **Admin dispute-resolution view.** Disputes can be raised; admin
   review UI is not built. For V1, support reads the `disputes` table
   directly in the Supabase dashboard.
9. **Insurance integration.** Phase 2.

---

## Getting started

### 1. Install dependencies

```bash
cd ridedrop-web
npm install
```

### 2. Set up Supabase

1. Create a free project at https://supabase.com (London region).
2. Open the **SQL editor**, paste `supabase/schema.sql`, **Run**.
3. Open the SQL editor again, paste `supabase/storage.sql`, **Run**.
   (This creates the two storage buckets and their policies.)
4. Copy `.env.example` to `.env.local` and fill in the Supabase keys
   from **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)

### 2b. Set up Stripe (test mode — instant, free)

1. Create an account at https://stripe.com.
2. Go to **Developers → API keys** → copy your `Test mode` secret +
   publishable key into `.env.local`.
3. Install the Stripe CLI (`brew install stripe/stripe-cli/stripe`),
   then in a separate terminal run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

### 2c. (Optional) Set up Resend for emails

1. Create an account at https://resend.com — free tier, instant.
2. **API Keys → Create API Key** → copy into `RESEND_API_KEY`.
3. In test mode, emails only deliver to the address you signed up with,
   which is what we want for V1.

### 3. Run the dev server

```bash
npm run dev
# open http://localhost:3000
```

### 4. Create yourself a test account

Go to `/signup`, create an account, then visit `/dashboard`.

If **email confirmations** are on (the Supabase default), you'll need to
click the confirmation link in the email Supabase sends before you can log
in. To skip that during development, turn it off at **Authentication →
Providers → Email → Confirm email = off**.

### 5. (Optional) Seed demo data

```bash
npm run seed
```

This creates four demo users (James, Riya, Sarah, Alex), two listed
journeys on London → Manchester, and two open jobs. Now `/jobs/browse`
and `/journeys/browse` have content from the get-go. The demo accounts
have `password = demo-password-CHANGE-ME` if you want to log in as them.

### 6. The full V1 demo (you can do this end-to-end today)

Open two browsers (Chrome + an incognito window so they have separate
sessions). Call them **Sender** and **Carrier**.

1. **Carrier** signs up at `/signup`, picks role `Carry`. On `/profile`
   click "Verify my ID (demo)" — flips the verification flag.
2. **Carrier** goes to `/journeys/new`, lists a journey
   London Euston → Manchester Piccadilly tomorrow at 09:00, capacity
   1, min price £20.
3. In the Supabase dashboard, **Table editor → journeys**, flip the
   new row's `status` from `ticket_pending` to `listed`. (In Phase 2
   this happens automatically via OCR ticket verification.)
4. **Sender** signs up at `/signup`, picks role `Send`.
5. **Sender** posts a job at `/send`: London Euston → Manchester
   Piccadilly, budget £28, package "Legal documents", accept the
   declaration.
6. **Carrier** at `/jobs/browse` sees the job. Opens it, picks their
   journey, sets price £28, clicks Accept. Lands on `/bookings/[id]`.
7. **Sender** logs back in, opens `/bookings`, sees the booking. Clicks
   "Pay £28" → Stripe Checkout opens. Pay with test card
   `4242 4242 4242 4242`, any future date, any 3-digit CVC. Redirects
   back as "Paid".
8. **Sender** sees the pickup PIN (e.g. `4729`) and reads it out.
9. **Carrier** types the PIN into the booking page, takes the
   pickup photo with their phone. Status → `picked_up`.
10. Both parties **chat** via the real-time thread on the booking page.
11. **Carrier** takes the delivery photo at drop-off. Recipient reads
    the delivery PIN. Carrier types it. Status → `delivered`.
12. **Sender** clicks "Confirm delivery". Status → `completed`. The
    carrier's `total_deliveries` and `total_earnings_pence` bump up
    (visible in the Supabase table editor).
13. Both sides leave a 5-star review.

That's a complete RideDrop transaction. The only thing that didn't happen
for real is the carrier getting paid into a bank account — that needs
Stripe Connect approval (see `docs/stripe-setup.md`).

---

## File layout

```
ridedrop-web/
├── supabase/
│   ├── schema.sql        ← the database (run this in Supabase SQL editor)
│   └── README.md         ← Supabase-specific setup notes
├── scripts/
│   └── seed.ts           ← demo data; run with `npm run seed`
├── docs/
│   └── stripe-setup.md   ← end-to-end Stripe integration plan
├── src/
│   ├── app/              ← Next.js App Router pages
│   │   ├── page.tsx              landing page + waitlist
│   │   ├── login/, signup/       auth
│   │   ├── dashboard/            home for logged-in users
│   │   ├── send/                 sender posts a job
│   │   ├── journeys/new/         carrier lists a journey
│   │   ├── journeys/browse/      sender browses carriers
│   │   ├── jobs/browse/          carrier browses open jobs
│   │   ├── jobs/[id]/            job detail + accept form
│   │   ├── bookings/             list bookings + detail page
│   │   ├── profile/              edit profile / toggle role
│   │   ├── privacy/, terms/      placeholder legal pages
│   │   ├── logout/route.ts       POST /logout
│   │   └── api/
│   │       ├── waitlist/         landing-page waitlist endpoint
│   │       └── webhooks/stripe/  Stripe webhook receiver (v3, live)
│   ├── components/
│   │   ├── AppShell.tsx          shared nav for logged-in pages
│   │   └── WaitlistForm.tsx
│   ├── lib/
│   │   ├── types.ts              TS shape of the DB + constants
│   │   ├── stripe.ts             Stripe client (stub — fill in when keys arrive)
│   │   ├── actions/
│   │   │   └── accept-job.ts     server action: carrier accepts a job
│   │   └── supabase/
│   │       ├── client.ts         browser client
│   │       ├── server.ts         server client + service-role client
│   │       └── middleware.ts     session refresh + route protection
│   └── middleware.ts             wired to Next.js
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.mjs
└── .env.example
```

### How auth flows

1. User submits `/signup` or `/login` form → `@supabase/ssr` browser client
   calls Supabase Auth → cookies set.
2. `src/middleware.ts` runs on every request, calls
   `src/lib/supabase/middleware.ts → updateSession()` which refreshes the
   session cookie and redirects unauthenticated requests on protected paths
   to `/login?next=...`.
3. Server Components read the session via the server client
   (`src/lib/supabase/server.ts`).
4. A Postgres trigger (`tg_handle_new_user` in `schema.sql`) automatically
   creates a `public.profiles` row when a new user signs up.

### How RLS works

Every table has Row-Level Security enabled. Policies in `schema.sql`:

- `profiles` — public read (so we can show carrier names on listings),
  self-only write.
- `journeys` — public read of `status = 'listed'`, owner read of own at
  any status, owner-only write.
- `jobs` — public read of `status = 'open'`, owner read of own at any
  status, owner-only write.
- `bookings`, `messages`, `disputes` — only the booking's sender or
  carrier can read or write.
- `waitlist` — anyone (even unauthenticated) can insert; nobody can read
  via the API (export via Supabase dashboard or service-role).

The `waitlist` insert from the landing page is done via the
**service-role** client in the API route (`src/app/api/waitlist/route.ts`)
which bypasses RLS — this is fine because the route validates input with
zod first.

---

## Post-V1 roadmap (in the order I'd tackle them)

1. **Get Stripe Connect approved** (file the application now — it's the
   2–6 week clock). Once approved, add `application_fee_amount` +
   `transfer_data.destination` to the Checkout session and carriers
   start getting real bank payouts. See `docs/stripe-setup.md` for the
   exact code changes needed in
   `src/lib/actions/create-checkout-session.ts`.
2. **Replace the ID-verification stub** with the real Stripe Identity
   session flow. The button in `ProfileForm.tsx` currently calls
   `stub-verify-id.ts` — swap that for a redirect to the Stripe
   Identity hosted page.
3. **Apply for National Rail Darwin API access.** Once approved, replace
   the free-text departure/arrival inputs in `NewJourneyForm.tsx` with
   a train-picker that calls the Darwin live feed.
4. **OCR ticket verification.** Currently carriers' journey status is
   manually flipped from `ticket_pending` to `listed`. Add a job that
   runs OCR (Google Vision or AWS Textract) on uploaded tickets and
   auto-verifies them.
5. **Admin dispute UI.** For V1, support reads disputes in the Supabase
   table editor and manually flips the resolution. Build a proper
   admin view (could be a separate Next.js route gated by an admin
   role on profiles).
6. **Push notifications** for mobile. Web Push via Supabase Edge
   Functions, then add a PWA manifest.
7. **Counter-offer flow.** Phase 2. See README "What's NOT done" #7.
8. **Insurance integration.** Talk to hood.uk or Guardhog.

---

## Useful commands

```bash
npm run dev         # local dev server
npm run build       # production build
npm run typecheck   # TS check (recommended before every commit)
npm run lint        # eslint
```

## Deployment

Easiest path: connect this repo to **Vercel**, set the three env vars in
the Vercel dashboard, and `git push`. Vercel auto-deploys on every push to
`main`.

Supabase runs on its own (you don't deploy it), but make sure your Vercel
project URL is in **Authentication → URL Configuration → Site URL** and
**Redirect URLs** so signup confirmation emails redirect correctly.
