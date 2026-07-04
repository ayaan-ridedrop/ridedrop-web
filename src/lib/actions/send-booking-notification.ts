'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Notify the sender that a carrier has accepted their job.
 *
 * SECURITY: this is an exported server action, so it is reachable as a POST by
 * anyone. It therefore takes ONLY a bookingId and derives everything else
 * server-side:
 *   - the caller must be signed in, and must be the carrier on that booking;
 *   - the recipient is read from the booking record, never from a client arg
 *     (so it can't be used to enumerate arbitrary users' emails);
 *   - the resolved email is never written to logs.
 */
export async function sendBookingNotification(bookingId: string) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const admin = createServiceClient() as any;

  // Pull the booking + its job route via the service role.
  const { data: booking } = await admin
    .from('bookings')
    .select('id, sender_id, carrier_id, agreed_price_pence, jobs!inner(from_station, to_station)')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return { success: false };

  // Authorisation: only the carrier who just accepted may trigger this.
  if (booking.carrier_id !== user.id) return { success: false };

  const [{ data: senderProfile }, { data: senderUser }] = await Promise.all([
    admin.from('profiles').select('first_name').eq('id', booking.sender_id).maybeSingle(),
    admin.auth.admin.getUserById(booking.sender_id),
  ]);
  const senderEmail = senderUser?.user?.email;
  if (!senderEmail) return { success: false };

  const route = `${booking.jobs?.from_station} → ${booking.jobs?.to_station}`;
  const price = (booking.agreed_price_pence ?? 0) / 100;

  // TODO: wire a real email provider (Resend is already a dependency).
  // Log WITHOUT the email address — only non-PII identifiers.
  console.log(`[booking notification] queued for booking ${booking.id} (sender ${booking.sender_id}), route ${route}, £${price.toFixed(2)}`);

  // In production:
  // await emails.jobAccepted({ to: senderEmail, senderName: senderProfile?.first_name ?? 'there', route, bookingUrl: `.../bookings/${booking.id}` });

  return { success: true };
}
