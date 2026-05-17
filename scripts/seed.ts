// Seed script — creates demo users, journeys, jobs, completed bookings
// with reviews, and waitlist signups so the app looks lived-in.
//
// Run once:
//   npm run seed
//
// Idempotent: re-running won't create duplicates (looks up demo emails).
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Demo users ────────────────────────────────────────────────────
const CARRIERS = [
  { email: 'james.demo@ridedrop.co.uk', first_name: 'James', last_name: 'T.', home_city: 'London', deliveries: 47, rating: 4.9 },
  { email: 'riya.demo@ridedrop.co.uk', first_name: 'Riya', last_name: 'P.', home_city: 'London', deliveries: 12, rating: 4.6 },
  { email: 'marcus.demo@ridedrop.co.uk', first_name: 'Marcus', last_name: 'C.', home_city: 'Manchester', deliveries: 3, rating: 4.8 },
  { email: 'priya.demo@ridedrop.co.uk', first_name: 'Priya', last_name: 'S.', home_city: 'Leeds', deliveries: 28, rating: 4.95 },
  { email: 'tom.demo@ridedrop.co.uk', first_name: 'Tom', last_name: 'W.', home_city: 'Birmingham', deliveries: 19, rating: 4.7 },
  { email: 'aisha.demo@ridedrop.co.uk', first_name: 'Aisha', last_name: 'M.', home_city: 'Edinburgh', deliveries: 33, rating: 4.85 },
] as const;

const SENDERS = [
  { email: 'sarah.demo@ridedrop.co.uk', first_name: 'Sarah', last_name: 'K.', home_city: 'Manchester' },
  { email: 'alex.demo@ridedrop.co.uk', first_name: 'Alex', last_name: 'M.', home_city: 'Leeds' },
  { email: 'omar.demo@ridedrop.co.uk', first_name: 'Omar', last_name: 'R.', home_city: 'Birmingham' },
  { email: 'lisa.demo@ridedrop.co.uk', first_name: 'Lisa', last_name: 'W.', home_city: 'Edinburgh' },
] as const;

async function ensureUser(u: {
  email: string;
  first_name: string;
  last_name: string;
  home_city: string;
}, role: 'carrier' | 'sender'): Promise<string> {
  const { data: existing } = await admin.auth.admin.listUsers();
  const match = existing.users.find((x) => x.email === u.email);
  if (match) return match.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: 'demo-password-CHANGE-ME',
    email_confirm: true,
    user_metadata: {
      first_name: u.first_name,
      last_name: u.last_name,
      role,
    },
  });
  if (error) throw error;
  await admin
    .from('profiles')
    .update({ home_city: u.home_city })
    .eq('id', data.user.id);
  return data.user.id;
}

function tomorrowAt(h: number, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function daysAgo(days: number, h = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log('Seeding…');

  const ids: Record<string, string> = {};

  for (const c of CARRIERS) {
    const id = await ensureUser(c, 'carrier');
    ids[c.first_name] = id;
    await admin.from('carrier_profiles').upsert(
      {
        id,
        id_verification_status: 'verified',
        id_verified_at: new Date().toISOString(),
        total_deliveries: c.deliveries,
        average_rating: c.rating,
        payout_enabled: false,
      },
      { onConflict: 'id' },
    );
    console.log(`  ✓ carrier ${c.first_name} (${c.deliveries} deliveries, ${c.rating}★)`);
  }

  for (const s of SENDERS) {
    const id = await ensureUser(s, 'sender');
    ids[s.first_name] = id;
    console.log(`  ✓ sender ${s.first_name}`);
  }

  // ── Journeys across all 5 launch routes ──────────────────────────
  const journeys = [
    // London ↔ Manchester
    { carrier: 'James', from: 'London Euston', to: 'Manchester Piccadilly', dep: tomorrowAt(9, 14), arr: tomorrowAt(11, 32), op: 'Avanti West Coast', cap: 2, min: 2000, food: true },
    { carrier: 'Riya', from: 'London Euston', to: 'Manchester Piccadilly', dep: tomorrowAt(10, 30), arr: tomorrowAt(12, 49), op: 'Avanti West Coast', cap: 1, min: 2200, food: false },
    // London ↔ Leeds
    { carrier: 'Priya', from: "London King's Cross", to: 'Leeds', dep: tomorrowAt(8, 5), arr: tomorrowAt(10, 17), op: 'LNER', cap: 2, min: 1800, food: false },
    // London ↔ Birmingham
    { carrier: 'Tom', from: 'London Euston', to: 'Birmingham New Street', dep: tomorrowAt(11, 0), arr: tomorrowAt(12, 21), op: 'Avanti West Coast', cap: 3, min: 1200, food: true },
    // Manchester ↔ Edinburgh
    { carrier: 'Aisha', from: 'Manchester Piccadilly', to: 'Edinburgh Waverley', dep: tomorrowAt(13, 0), arr: tomorrowAt(16, 30), op: 'TransPennine Express', cap: 1, min: 2500, food: false },
  ];

  for (const j of journeys) {
    await admin
      .from('journeys')
      .insert({
        carrier_id: ids[j.carrier],
        from_station: j.from,
        to_station: j.to,
        departure_at: j.dep,
        arrival_at: j.arr,
        train_operator: j.op,
        capacity: j.cap,
        slots_remaining: j.cap,
        minimum_price_pence: j.min,
        max_weight_kg: 5,
        food_ok: j.food,
        status: 'listed',
      });
  }
  console.log(`  ✓ ${journeys.length} listed journeys`);

  // ── Open jobs across multiple routes ─────────────────────────────
  const jobs = [
    { sender: 'Sarah', from: 'London Euston', to: 'Manchester Piccadilly', desc: 'Legal documents (A4 envelope)', size: 'small', weight: 0.5, budget: 2800, urgent: true },
    { sender: 'Alex', from: 'London Euston', to: 'Manchester Piccadilly', desc: 'Birthday gift (clothing)', size: 'medium', weight: 1.8, budget: 2500 },
    { sender: 'Omar', from: "London King's Cross", to: 'Leeds', desc: 'Business documents', size: 'small', weight: 0.4, budget: 2200, urgent: true },
    { sender: 'Lisa', from: 'London Euston', to: 'Birmingham New Street', desc: 'Home-cooked food (sealed)', size: 'medium', weight: 2.5, budget: 1800 },
    { sender: 'Sarah', from: 'Manchester Piccadilly', to: 'Edinburgh Waverley', desc: 'Camera + accessories', size: 'medium', weight: 2, budget: 3500, urgent: true },
  ];

  for (const j of jobs) {
    await admin.from('jobs').insert({
      sender_id: ids[j.sender],
      from_station: j.from,
      to_station: j.to,
      package_description: j.desc,
      package_size: j.size,
      package_weight_kg: j.weight,
      declared_value_pence: 0,
      declaration_accepted: true,
      max_budget_pence: j.budget,
      status: 'open',
    });
  }
  console.log(`  ✓ ${jobs.length} open jobs`);

  // ── A few completed bookings with reviews ────────────────────────
  // These give the app a lived-in feel — carrier stats, recent payouts,
  // reviews on profiles.
  const completedBookings = [
    {
      sender: 'Sarah', carrier: 'James',
      from: 'London Euston', to: 'Manchester Piccadilly',
      desc: 'Documents', price: 2240, daysAgo: 3,
      senderReview: { rating: 5, body: 'Spot on. Photo at pickup, photo at drop-off, no fuss. Will book again.' },
      carrierReview: { rating: 5, body: 'Smooth handover, package was well packed. Perfect.' },
    },
    {
      sender: 'Alex', carrier: 'Priya',
      from: "London King's Cross", to: 'Leeds',
      desc: 'Gift parcel', price: 1760, daysAgo: 7,
      senderReview: { rating: 5, body: 'Brilliant — kept me updated the whole way.' },
    },
    {
      sender: 'Omar', carrier: 'Tom',
      from: 'London Euston', to: 'Birmingham New Street',
      desc: 'Electronics', price: 1500, daysAgo: 14,
      senderReview: { rating: 4, body: 'A bit late at pickup but otherwise good.' },
    },
  ];

  for (const cb of completedBookings) {
    // Need a job and a journey for the booking — make placeholder ones first.
    const { data: job } = await admin
      .from('jobs')
      .insert({
        sender_id: ids[cb.sender],
        from_station: cb.from,
        to_station: cb.to,
        package_description: cb.desc,
        package_size: 'small',
        declared_value_pence: 0,
        declaration_accepted: true,
        max_budget_pence: Math.round(cb.price * 1.25),
        status: 'completed',
        created_at: daysAgo(cb.daysAgo + 1),
      })
      .select('id')
      .single();

    const { data: journey } = await admin
      .from('journeys')
      .insert({
        carrier_id: ids[cb.carrier],
        from_station: cb.from,
        to_station: cb.to,
        departure_at: daysAgo(cb.daysAgo, 9),
        arrival_at: daysAgo(cb.daysAgo, 12),
        train_operator: 'Avanti West Coast',
        capacity: 1,
        slots_remaining: 0,
        minimum_price_pence: Math.round(cb.price * 0.8),
        max_weight_kg: 5,
        status: 'completed',
      })
      .select('id')
      .single();

    if (!job || !journey) continue;

    const { data: booking } = await admin
      .from('bookings')
      .insert({
        job_id: job.id,
        journey_id: journey.id,
        sender_id: ids[cb.sender],
        carrier_id: ids[cb.carrier],
        agreed_price_pence: Math.round(cb.price * 1.25),
        commission_pence: Math.round(cb.price * 0.25),
        status: 'completed',
        funds_released_at: daysAgo(cb.daysAgo - 1),
        stripe_payment_intent_id: `pi_demo_${Math.random().toString(36).slice(2, 10)}`,
      })
      .select('id')
      .single();

    if (!booking) continue;

    // Reviews — trigger recomputes average_rating on insert.
    await admin.from('reviews').insert({
      booking_id: booking.id,
      reviewer_id: ids[cb.sender],
      subject_id: ids[cb.carrier],
      rating: cb.senderReview.rating,
      body: cb.senderReview.body,
    });
    if (cb.carrierReview) {
      await admin.from('reviews').insert({
        booking_id: booking.id,
        reviewer_id: ids[cb.carrier],
        subject_id: ids[cb.sender],
        rating: cb.carrierReview.rating,
        body: cb.carrierReview.body,
      });
    }
  }
  console.log(`  ✓ ${completedBookings.length} completed bookings with reviews`);

  // ── Sample waitlist entries ──────────────────────────────────────
  const waitlistEntries = [
    { email: 'emma.example@gmail.com', name: 'Emma', city: 'London', role_interest: 'sender', source: 'landing' },
    { email: 'liam.example@gmail.com', name: 'Liam', city: 'Manchester', role_interest: 'carrier', source: 'landing' },
    { email: 'sofia.example@gmail.com', name: 'Sofia', city: 'Leeds', role_interest: 'both', source: 'landing' },
  ];
  await admin
    .from('waitlist')
    .upsert(waitlistEntries, { onConflict: 'email', ignoreDuplicates: true });
  console.log(`  ✓ ${waitlistEntries.length} waitlist signups`);

  console.log('');
  console.log('Done. Sign in as any demo user with password "demo-password-CHANGE-ME",');
  console.log('or create your own account at /signup.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
