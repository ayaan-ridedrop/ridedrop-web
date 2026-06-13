// Marketing landing page. Public-facing front door. No auth.
// Ported from the original ridedrop-landing.html prototype — same content,
// same vibe, now backed by a real waitlist endpoint.

import Link from 'next/link';
import WaitlistForm from '@/components/WaitlistForm';
import RouteAnimation from '@/components/landing/RouteAnimation';
import EarningsCalculator from '@/components/landing/EarningsCalculator';
import FaqAccordion from '@/components/landing/FaqAccordion';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-cream/85 backdrop-blur border-b border-black/5">
        <Link href="/" className="font-display font-extrabold text-xl">
          <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <div className="hidden lg:flex items-center gap-7 text-sm text-ink-soft whitespace-nowrap">
          <a href="#how">How it works</a>
          <a href="#why">Why RideDrop</a>
          <a href="#carriers">Earn</a>
          <a href="#routes">Routes</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm text-ink-soft hover:text-ink hidden lg:inline"
          >
            Sign up
          </Link>
          <Link
            href="/signup"
            className="bg-ink text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-accent transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center px-6 md:px-12 pt-32 pb-20 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-rail hidden md:block"
             style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:flex items-center justify-center pl-16">
          <RouteAnimation />
        </div>

        <div className="relative z-10 max-w-2xl rd-fade-up">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-3 py-1 rounded-full text-xs font-medium mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-mid animate-pulse" />
            Now open across the UK
          </div>
          <h1 className="text-5xl md:text-7xl leading-[1.02] mb-6">
            Someone's already<br />
            going <em className="not-italic text-accent-mid">your way.</em>
          </h1>
          <p className="text-lg text-ink-soft max-w-xl mb-10 font-light leading-relaxed">
            RideDrop connects people who need to send packages between UK cities
            with travellers already making that train journey. Faster than
            Royal Mail. Cheaper than couriers.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#signup"
              className="bg-ink text-white px-7 py-3.5 rounded-full font-medium hover:bg-accent transition"
            >
              Send a package
            </a>
            <a
              href="#carriers"
              className="border border-rail-dark px-7 py-3.5 rounded-full font-medium hover:border-ink transition"
            >
              Earn as a carrier →
            </a>
          </div>
          <div className="flex flex-wrap gap-10 mt-14 pt-10 border-t border-rail-dark/40">
            <Stat num="2h" label="Avg. delivery time" />
            <Stat num="£15" label="Starting price" />
            <Stat num="5+" label="Major UK routes" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 md:px-12 py-20 md:py-28">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="text-3xl md:text-5xl mb-4">Simple for both sides.</h2>
        <p className="text-ink-soft max-w-xl mb-12 font-light">
          Whether you're sending or carrying, RideDrop handles the match, the
          payment, and the confirmation.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-ink text-white font-display font-bold px-5 py-3.5 rounded-xl">
              I need to send something
            </div>
            {SENDER_STEPS.map((s, i) => (
              <Step key={i} num={i + 1} title={s.title} body={s.body} />
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-accent text-white font-display font-bold px-5 py-3.5 rounded-xl">
              I'm already travelling
            </div>
            {CARRIER_STEPS.map((s, i) => (
              <Step key={i} num={i + 1} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </section>

      {/* WHY RIDEDROP */}
      <section id="why" className="bg-ink text-white px-6 md:px-12 py-20 md:py-28">
        <Eyebrow accent>Why RideDrop</Eyebrow>
        <h2 className="text-3xl md:text-5xl mb-4 text-white">Built different.</h2>
        <p className="text-white/55 max-w-xl mb-12 font-light">
          Royal Mail takes a day. Courier companies are expensive. RideDrop uses
          train journeys that are already happening.
        </p>

        <div className="grid md:grid-cols-3 rounded-2xl overflow-hidden border border-white/10">
          {WHY_CARDS.map((c) => (
            <div
              key={c.title}
              className="p-9 bg-white/[0.03] hover:bg-white/[0.07] transition border-t border-white/10 first:border-t-0 md:border-t-0 md:border-l md:first:border-l-0"
            >
              <div className="w-11 h-11 rounded-xl bg-accent-light flex items-center justify-center text-xl mb-5">
                {c.icon}
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                {c.title}
              </h3>
              <p className="text-sm text-white/55 font-light leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EARN AS A CARRIER */}
      <section id="carriers" className="bg-accent-light px-6 md:px-12 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Eyebrow>For carriers</Eyebrow>
            <h2 className="text-3xl md:text-5xl mb-4 text-accent">
              Your commute is worth money.
            </h2>
            <p className="text-accent/70 max-w-md mb-10 font-light">
              You're already on the train. RideDrop lets you earn from space you
              weren't using.
            </p>
            <div className="space-y-5">
              {CARRIER_PERKS.map((p) => (
                <div key={p.title} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                  <div>
                    <h3 className="font-display font-medium text-base text-accent mb-1">
                      {p.title}
                    </h3>
                    <p className="text-sm text-accent/70 font-light leading-snug">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* ROUTES */}
      <section id="routes" className="px-6 md:px-12 py-20 md:py-28">
        <Eyebrow>Launch routes</Eyebrow>
        <h2 className="text-3xl md:text-5xl mb-4">
          Starting with the UK's busiest corridors.
        </h2>
        <p className="text-ink-soft max-w-xl mb-12 font-light">
          We're launching on five routes first. More cities coming as we grow.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {ROUTES.map((r) => (
            <div
              key={r.cities}
              className="bg-white border border-rail rounded-2xl p-6 hover:border-accent-mid hover:-translate-y-1 transition"
            >
              <div className="font-display font-bold text-base mb-1.5">
                {r.cities}
              </div>
              <div className="text-xs text-ink-muted mb-3">{r.detail}</div>
              <div className="font-display font-extrabold text-2xl text-accent">
                £{r.price}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">
                minimum price
              </div>
            </div>
          ))}
          <div className="bg-white border border-dashed border-rail-dark rounded-2xl p-6 opacity-70">
            <div className="font-display font-bold text-base mb-1.5 text-ink-muted">
              More routes
            </div>
            <div className="text-xs text-ink-muted">
              Bristol, Liverpool, Newcastle, Cardiff and more — coming soon
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="signup" className="px-6 md:px-12 py-20 md:py-28 bg-ink text-white text-center">
        <Eyebrow accent>Get started</Eyebrow>
        <h2 className="text-3xl md:text-5xl mb-3 text-white">Send your first package.</h2>
        <p className="text-white/55 max-w-md mx-auto mb-12 font-light">
          Tell us your route and we'll match you with travellers already making
          the trip. Sign up to get started.
        </p>
        <WaitlistForm />
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 md:px-12 py-20 md:py-28">
        <Eyebrow>Questions</Eyebrow>
        <h2 className="text-3xl md:text-5xl mb-12">Straight answers.</h2>
        <FaqAccordion items={FAQ} />
      </section>

      {/* FOOTER */}
      <footer className="bg-ink text-white/40 px-6 md:px-12 py-10 flex flex-wrap justify-between items-center gap-4 border-t border-white/10">
        <Link href="/" className="font-display font-extrabold text-lg text-white">
          <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <p className="text-xs">
          © 2026 RideDrop Ltd · Registered in England &amp; Wales, company no.
          17274629 · All rights reserved.
        </p>
        <div className="flex gap-6 text-xs">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:hello@ridedrop.co.uk">Contact</a>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`text-xs font-semibold tracking-[0.12em] uppercase mb-4 ${
        accent ? 'text-accent-mid' : 'text-accent-mid'
      }`}
    >
      {children}
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="font-display font-extrabold text-3xl tracking-tight">{num}</div>
      <div className="text-xs text-ink-muted mt-1">{label}</div>
    </div>
  );
}

function Step({ num, title, body }: { num: number; title: string; body: string }) {
  return (
    <div className="bg-white border border-rail rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition">
      <div className="text-xs font-extrabold tracking-widest text-ink-muted mb-2 font-display">
        STEP 0{num}
      </div>
      <div className="font-display font-bold text-base mb-1.5">{title}</div>
      <p className="text-sm text-ink-soft font-light leading-relaxed">{body}</p>
    </div>
  );
}

const SENDER_STEPS = [
  { title: 'Post your delivery job', body: "Tell us where it needs to go, when, what it is, and what you're happy to pay. Takes under 2 minutes." },
  { title: 'Choose your carrier', body: 'Browse verified carriers already travelling your route. Read reviews, check their rating, pick the one you trust.' },
  { title: 'Track it all the way', body: 'Photo at pickup. Photo at delivery. No guesswork, no waiting by the door.' },
];

const CARRIER_STEPS = [
  { title: 'List your journey', body: "Tell us your route, departure time, and how much you can carry. Set your minimum price." },
  { title: 'Accept a job', body: 'Browse open delivery jobs on your route. Accept the ones that work for you. Coordinate pickup via in-app chat.' },
  { title: 'Deliver and get paid', body: 'Take a photo at pickup and on delivery. Payment lands in your bank within 24h of confirmed delivery.' },
];

const WHY_CARDS = [
  { icon: '→', title: 'Hours, not days', body: 'A London to Manchester train takes 2 hours. Your package can be there before Royal Mail even picks it up.' },
  { icon: '✓', title: 'Verified carriers only', body: "Every carrier verifies their government ID before they can accept jobs. You know exactly who's carrying your package." },
  { icon: '£', title: 'Fair pricing', body: "You set what you're willing to pay. Carriers aren't making a special trip — they're going anyway. That keeps prices honest." },
  { icon: '✓', title: 'Photo proof every time', body: 'Photo taken at pickup. Photo taken at delivery. GPS-tagged. Full accountability built in.' },
  { icon: '→', title: 'Better for the planet', body: "No extra van on the road. No extra carbon. The train is going anyway — we're just filling empty space." },
  { icon: '◇', title: 'In-app coordination', body: "No sharing phone numbers. Sender and carrier communicate safely through RideDrop's built-in chat." },
];

const CARRIER_PERKS = [
  { title: 'No special equipment', body: 'If it fits in your bag, you can carry it. No vehicle, no uniform, no training.' },
  { title: 'You control your journey', body: 'You list your route. You set your minimum price. RideDrop never dictates your schedule.' },
  { title: 'Paid within 24 hours', body: 'Stripe sends earnings to your bank the day after delivery is confirmed.' },
  { title: 'Build your reputation', body: 'Great reviews mean more jobs and higher prices. Consistent carriers earn significantly more over time.' },
];

const ROUTES = [
  { cities: 'London → Manchester', detail: '2h 10m by train · Up to 4 carriers/day', price: 20 },
  { cities: 'London → Leeds', detail: '2h 12m by train · Multiple daily', price: 18 },
  { cities: 'London → Birmingham', detail: '1h 21m by train · Very frequent', price: 12 },
  { cities: 'Manchester → Edinburgh', detail: '3h 30m by train · Daily', price: 25 },
];

const FAQ = [
  { q: 'Is this legal?', a: 'Yes. There is no UK law preventing individuals from carrying packages for others on trains. RideDrop operates as a peer-to-peer platform connecting independent parties, similar to Airbnb or Vinted. Our terms of service are clear about responsibilities on both sides.' },
  { q: 'What if my package gets lost or damaged?', a: 'Carriers are responsible for items in their care from pickup to delivery. We capture photo evidence at both ends. If something goes wrong, our support team reviews the evidence and mediates. Insurance integration is on the Phase 2 roadmap.' },
  { q: 'How are carriers verified?', a: 'Every carrier completes government-issued ID verification before they can accept any jobs. They also link a real bank account via Stripe for payouts. Only verified carriers appear in search results.' },
  { q: 'What can I send?', a: 'Anything that fits in a standard bag — documents, gifts, clothing, small electronics, food (if the carrier opts in). Prohibited items include cash, weapons, controlled substances, live animals, and anything banned on public transport.' },
  { q: 'How does payment work?', a: 'Senders pay upfront when they confirm a carrier. The payment is held securely by Stripe until delivery is confirmed. Carriers receive their earnings (minus RideDrop\'s 20% commission) within 24 hours of a completed delivery.' },
  { q: 'Which routes can I use?', a: "We're rolling out across key UK rail routes now, starting with the busiest city pairs and adding more as the carrier network grows. Sign up to see carriers already travelling your route." },
];
