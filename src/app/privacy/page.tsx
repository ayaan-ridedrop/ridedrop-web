// Privacy Policy — proper UK GDPR draft.
//
// ⚠️ STILL NEEDS A UK LAWYER TO REVIEW BEFORE GOING LIVE.
// This is a solid starting point that covers the actual data RideDrop
// collects (per the codebase) and the data processors actually used
// (Supabase, Stripe, Resend). Don't just rubber-stamp this — get it
// checked.

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy · RideDrop',
  description: 'How RideDrop collects, uses, and protects your personal data.',
};

const UPDATED = '15 May 2026';

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="font-display font-extrabold text-xl block mb-10">
        RideDrop<span className="text-accent-mid">.</span>
      </Link>
      <h1 className="text-4xl mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: {UPDATED}</p>

      <p className="text-ink-muted text-sm font-light mb-10">
        This policy will be finalised with legal counsel before public launch.
        It reflects the data RideDrop processes today.
      </p>

      <div className="space-y-8 text-ink-soft font-light leading-relaxed">
        <Section title="1. Who we are">
          <p>
            RideDrop is operated by [Company Name to be inserted once Ltd is
            registered], a private limited company in the UK. We are the
            <em> data controller</em> for the personal data we collect through
            ridedrop.co.uk and our mobile app. Contact us at{' '}
            <a className="underline" href="mailto:privacy@ridedrop.co.uk">
              privacy@ridedrop.co.uk
            </a>.
          </p>
        </Section>

        <Section title="2. What we collect, and why">
          <p>
            We collect only what we need to run the marketplace, take payment,
            and resolve disputes.
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>Account data</strong> — email, name, phone, home city,
              role (sender / carrier). Lawful basis: contract performance.
            </li>
            <li>
              <strong>Identity verification (carriers only)</strong> — a
              government ID document and selfie, processed by{' '}
              <strong>Stripe Identity</strong>. We do not store the ID document
              on our servers; we store only a verification status and Stripe
              session ID. Lawful basis: legal obligation (fraud prevention) and
              contract performance.
            </li>
            <li>
              <strong>Payment details</strong> — processed by{' '}
              <strong>Stripe</strong>. We never see your card number. We store
              a Stripe payment-intent ID against each booking. Lawful basis:
              contract performance.
            </li>
            <li>
              <strong>Delivery records</strong> — pickup and delivery photos,
              GPS coordinates captured at upload, handoff PINs, in-app
              messages, ratings and reviews. Lawful basis: contract performance
              and our legitimate interest in resolving disputes.
            </li>
            <li>
              <strong>Waitlist signups</strong> — email, optional name and
              city. Lawful basis: consent (you ticked the signup box).
            </li>
            <li>
              <strong>Technical data</strong> — IP address, browser type,
              cookies (see section 5). Lawful basis: legitimate interest in
              keeping the service running and secure.
            </li>
          </ul>
        </Section>

        <Section title="3. Who we share data with">
          <p>
            We share the minimum necessary with our data processors. They all
            act on our written instructions.
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>Supabase</strong> (database, auth, file storage) — hosted
              in the EU (London region). Standard contractual clauses in place.
            </li>
            <li>
              <strong>Stripe</strong> (payments + identity verification) —
              global processor, UK and US data centres.
            </li>
            <li>
              <strong>Resend</strong> (transactional emails).
            </li>
            <li>
              <strong>Netlify</strong> (web hosting).
            </li>
          </ul>
          <p className="mt-3">
            We will <strong>never</strong> sell your data, share it with
            advertisers, or use it to train AI models.
          </p>
        </Section>

        <Section title="4. How long we keep it">
          <ul className="list-disc pl-6 mt-1 space-y-2">
            <li><strong>Account data</strong> — until you delete your account.</li>
            <li><strong>Bookings, photos, messages</strong> — 6 years after the booking is closed, for tax + dispute resolution purposes.</li>
            <li><strong>Waitlist signups</strong> — until you unsubscribe, or 2 years from signup, whichever is sooner.</li>
            <li><strong>Server logs</strong> — 30 days.</li>
          </ul>
        </Section>

        <Section title="5. Cookies">
          <p>
            We use two categories of cookies. You can change your choice any
            time via the cookie banner at the bottom of the page.
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>Strictly necessary</strong> — Supabase auth cookies that
              keep you signed in. Cannot be turned off.
            </li>
            <li>
              <strong>Analytics (optional)</strong> — anonymous, aggregated
              page-view data. Off by default until you accept.
            </li>
          </ul>
        </Section>

        <Section title="6. Your rights">
          <p>Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>access the personal data we hold about you;</li>
            <li>have inaccurate data corrected;</li>
            <li>have your data erased ("right to be forgotten");</li>
            <li>restrict or object to our processing;</li>
            <li>have your data exported in a portable format;</li>
            <li>complain to the ICO if you think we've got it wrong.</li>
          </ul>
          <p className="mt-3">
            Email <a className="underline" href="mailto:privacy@ridedrop.co.uk">privacy@ridedrop.co.uk</a> for any of the above. We'll respond within 30 days.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            All data is encrypted in transit (HTTPS) and at rest (Supabase's
            AES-256). Photos and ID documents are stored in private buckets
            accessible only to the booking participants. Database access is
            governed by row-level security policies.
          </p>
        </Section>

        <Section title="8. Children">
          <p>RideDrop is not for under-18s. We don't knowingly collect data from minors.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            We'll notify you by email of material changes before they take
            effect. The "last updated" date at the top of this page always
            reflects the current version.
          </p>
        </Section>

        <Section title="10. Complaints">
          <p>
            You can complain to the UK Information Commissioner's Office at{' '}
            <a className="underline" href="https://ico.org.uk" target="_blank" rel="noreferrer">
              ico.org.uk
            </a>{' '}or by calling 0303 123 1113.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-bold text-xl text-ink mb-3">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
