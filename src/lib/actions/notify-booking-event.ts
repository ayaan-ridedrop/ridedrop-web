// Server Actions — fire transactional emails for booking lifecycle events
// that happen client-side (PIN generation, handover confirmation).
// Each action re-verifies the event actually happened in the database
// before emailing, so a malicious client can't trigger spam.

'use server';

import { createClient } from '@/lib/supabase/server';
import { emails } from '@/lib/email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ridedrop.co.uk';

async function loadBooking(bookingId: string) {
  const supabase = createClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: b } = await supabase
    .from('bookings')
    .select('id, sender_id, carrier_id, status, pickup_pin, agreed_price_pence, commission_pence, job_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!b || (b.sender_id !== user.id && b.carrier_id !== user.id)) return null;

  const [{ data: job }, { data: sender }, { data: carrier }] = await Promise.all([
    supabase.from('jobs').select('from_station, to_station').eq('id', b.job_id).single(),
    supabase.from('profiles').select('email, first_name').eq('id', b.sender_id).single(),
    supabase.from('profiles').select('email, first_name').eq('id', b.carrier_id).single(),
  ]);
  if (!job || !sender || !carrier) return null;

  return {
    booking: b,
    user,
    route: `${job.from_station} → ${job.to_station}`,
    sender,
    carrier,
    url: `${SITE}/bookings/${b.id}`,
  };
}

/** Sender generated PINs → tell the carrier pickup can happen. */
export async function notifyPinsGenerated(bookingId: string) {
  const ctx = await loadBooking(bookingId);
  if (!ctx) return;
  const { booking, user, route, carrier, url } = ctx;
  if (user.id !== booking.sender_id) return; // only the sender triggers this
  if (!booking.pickup_pin) return; // PINs must actually exist

  await emails.pinsGenerated({
    to: carrier.email,
    carrierName: carrier.first_name ?? 'there',
    route,
    bookingUrl: url,
  });
}

/** Carrier confirmed delivery → tell the sender (dispute window) and the
 *  carrier (payout pending). */
export async function notifyDelivered(bookingId: string) {
  const ctx = await loadBooking(bookingId);
  if (!ctx) return;
  const { booking, user, route, sender, carrier, url } = ctx;
  if (user.id !== booking.carrier_id) return; // only the carrier triggers this
  if (booking.status !== 'delivered') return; // must actually be delivered

  const netGbp = (booking.agreed_price_pence - booking.commission_pence) / 100;

  await Promise.all([
    emails.packageDelivered({
      to: sender.email,
      senderName: sender.first_name ?? 'there',
      route,
      bookingUrl: url,
    }),
    emails.deliveryConfirmed({
      to: carrier.email,
      name: carrier.first_name ?? 'there',
      route,
      amountGbp: netGbp,
      bookingUrl: url,
    }),
  ]);
}
