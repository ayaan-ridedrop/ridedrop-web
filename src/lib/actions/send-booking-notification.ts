'use server';

import { createServiceClient } from '@/lib/supabase/server';

/**
 * Send email notification when a booking is created.
 * Notifies the sender that a carrier has accepted their job.
 *
 * Takes the sender's user ID (not their email) — emails live in auth.users,
 * which only the server can read via the service-role client. Client
 * components must never receive another user's email address.
 */
export async function sendBookingNotification(
  bookingId: string,
  senderId: string,
  senderName: string,
  carrierName: string,
  route: string,
  price: number
) {
  // Look up the sender's email server-side (service role bypasses RLS;
  // auth.users is not queryable from the browser at all).
  const admin = createServiceClient() as any;
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(senderId);
  const senderEmail = userData?.user?.email;

  if (userErr || !senderEmail) {
    console.error('[booking notification] could not resolve sender email:', userErr);
    return { success: false };
  }

  // TODO: Integrate with email service (SendGrid, Postmark, etc.)
  // For now, this is a placeholder that logs the notification

  console.log(`
    📧 BOOKING NOTIFICATION
    To: ${senderEmail}
    Subject: Your delivery has been accepted!

    Hi ${senderName},

    Great news! ${carrierName} has accepted your delivery job for ${route}.

    Agreed price: £${price.toFixed(2)}
    Booking ID: ${bookingId}

    You can view the details and chat with ${carrierName} at:
    https://ridedrop.co.uk/bookings/${bookingId}

    Best regards,
    RideDrop Team
  `);

  // In production, call your email provider here:
  // const emailResult = await sendgrid.send({
  //   to: senderEmail,
  //   from: 'noreply@ridedrop.co.uk',
  //   subject: 'Your delivery has been accepted!',
  //   html: `...`
  // });

  return { success: true };
}
