// Terms of Service — proper UK draft.
//
// ⚠️ MUST be reviewed by a UK lawyer before launch. This is a peer-to-peer
// marketplace with carriage of physical goods between strangers — liability
// is the central legal risk. The two T&C drafts in the parent folder
// (RideDrop_Terms_and_Conditions_v1.docx, _v2.docx) are the original source
// material; this draft merges them in a clean structure.

import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · RideDrop',
  description: 'The rules and responsibilities for using RideDrop.',
};

const UPDATED = '15 May 2026';

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="font-display font-extrabold text-xl block mb-10">
        RideDrop<span className="text-accent-mid">.</span>
      </Link>
      <h1 className="text-4xl mb-2">Terms of Service</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: {UPDATED}</p>

      <p className="text-ink-muted text-sm font-light mb-10">
        These terms will be finalised with legal counsel before public launch.
      </p>

      <div className="space-y-8 text-ink-soft font-light leading-relaxed">
        <Section title="1. What RideDrop is (and what it isn't)">
          <p>
            RideDrop is a peer-to-peer marketplace that connects people who want
            to send a package between UK cities ("senders") with people
            already making that train journey ("carriers"). RideDrop is
            <strong> not</strong> a courier, freight forwarder, or postal
            service. RideDrop is a technology platform.
          </p>
          <p className="mt-3">
            We do not transport packages ourselves. We are not a party to the
            carriage contract between sender and carrier. RideDrop's role is to
            facilitate matching, hold payment in escrow, and provide tools
            for evidence and dispute resolution.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be 18 or over to use RideDrop. By using RideDrop you confirm
            that you are 18+ and have the legal capacity to enter contracts.
          </p>
        </Section>

        <Section title="3. Account & verification">
          <p>
            Senders need a valid email address. Carriers must complete
            government-issued ID verification (via Stripe Identity) and link
            a UK bank account (via Stripe Connect) before they can accept
            jobs or receive payouts.
          </p>
          <p className="mt-3">
            You are responsible for keeping your account secure. You must
            notify us at <a className="underline" href="mailto:support@ridedrop.co.uk">support@ridedrop.co.uk</a> if you suspect unauthorised access.
          </p>
        </Section>

        <Section title="4. Sender responsibilities">
          <ul className="list-disc pl-6 mt-1 space-y-2">
            <li>
              You must declare the contents of every package accurately. A
              false or misleading declaration is a fundamental breach of
              these terms and may be reported to the relevant authorities.
            </li>
            <li>
              You must not send any prohibited items (see section 6).
            </li>
            <li>
              You must be available at the agreed pickup and delivery
              locations at the agreed times.
            </li>
            <li>
              You are responsible for packaging items adequately. RideDrop is
              not liable for damage caused by inadequate packaging.
            </li>
          </ul>
        </Section>

        <Section title="5. Carrier responsibilities">
          <ul className="list-disc pl-6 mt-1 space-y-2">
            <li>
              You must hold a valid travel ticket for the journey you list.
              Listing a journey you don't have a ticket for is a fundamental
              breach.
            </li>
            <li>
              You must take reasonable care of every package from collection
              to delivery.
            </li>
            <li>
              You must take and upload pickup and delivery photos as required
              by the app.
            </li>
            <li>
              You must not open, tamper with, or repackage a package.
            </li>
            <li>
              You must not accept a package that appears damaged, leaking,
              or whose contents do not match the sender's declaration.
            </li>
            <li>
              You acknowledge that as the carrier, you may be questioned by
              transport staff or law enforcement about a package's contents.
              RideDrop's role does not relieve you of any personal legal
              responsibility for items in your possession.
            </li>
          </ul>
        </Section>

        <Section title="6. Prohibited items">
          <p>The following must never be sent via RideDrop:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Cash, bank cards, cheques, or other negotiable instruments.</li>
            <li>Weapons, ammunition, or anything resembling a weapon.</li>
            <li>Controlled or illegal drugs, or anything used to take them.</li>
            <li>Hazardous materials (flammables, corrosives, explosives, batteries above standard consumer limits).</li>
            <li>Live animals or perishable goods unless explicitly opted in by the carrier.</li>
            <li>Stolen goods, counterfeit goods, or anything in breach of UK law.</li>
            <li>Anything prohibited by the train operator on whose service the package travels.</li>
          </ul>
          <p className="mt-3">
            Sending a prohibited item is a fundamental breach. RideDrop reserves
            the right to refund the carrier, withhold all funds from the
            sender, terminate the account, and report the matter to the
            police.
          </p>
        </Section>

        <Section title="7. Payment, escrow, and commission">
          <p>
            The sender pays in advance. Funds are held in escrow by Stripe.
            Funds are released to the carrier 24 hours after delivery is
            confirmed (or sooner, if the sender confirms manually). RideDrop
            takes a 20% commission from each completed delivery.
          </p>
          <p className="mt-3">
            If a dispute is raised, funds are frozen until RideDrop's support
            team has reviewed the evidence and made a determination. See
            section 9.
          </p>
        </Section>

        <Section title="8. Cancellation & refunds">
          <ul className="list-disc pl-6 mt-1 space-y-2">
            <li>A sender may cancel a booking at any time before the carrier collects, with a full refund.</li>
            <li>After collection, cancellation requires raising a dispute.</li>
            <li>A carrier who fails to collect within 2 hours of the agreed time is in breach; sender receives a full refund.</li>
          </ul>
        </Section>

        <Section title="9. Disputes">
          <p>
            Either party may raise a dispute at any time during an active
            booking. RideDrop's support team will review photo evidence, chat
            history, and PIN verification records to make a determination.
            Our decision is final unless either party wishes to pursue the
            matter through the courts.
          </p>
        </Section>

        <Section title="10. Liability">
          <p>
            RideDrop is a platform that facilitates contracts between
            independent senders and carriers. RideDrop is not a party to those
            contracts and is not liable for loss of or damage to packages,
            delays, or any other failure of performance by a sender or
            carrier.
          </p>
          <p className="mt-3">
            To the maximum extent permitted by law, RideDrop's aggregate
            liability to any user for any claim arising under or in
            connection with these terms is limited to the greater of (a)
            £100, or (b) the total commission paid to RideDrop by that user in
            the 12 months preceding the claim.
          </p>
          <p className="mt-3">
            Nothing in these terms limits or excludes liability for death or
            personal injury caused by negligence, fraud, or any other
            liability that cannot be limited under UK law.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You may close your account at any time. RideDrop may suspend or
            terminate your account for breach of these terms, suspected
            fraud, or repeated low ratings.
          </p>
        </Section>

        <Section title="12. Governing law">
          <p>
            These terms are governed by the laws of England and Wales. The
            courts of England and Wales have exclusive jurisdiction.
          </p>
        </Section>

        <Section title="13. Changes">
          <p>
            We may update these terms. Material changes will be notified by
            email at least 14 days before they take effect.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            <a className="underline" href="mailto:support@ridedrop.co.uk">support@ridedrop.co.uk</a> for everything.
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
