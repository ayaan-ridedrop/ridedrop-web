'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Send email notification when a booking is created.
 * Notifies the sender that a carrier has accepted their job.
 */
export async function sendBookingNotification(
  bookingId: string,
  senderEmail: string,
  senderName: string,
  carrierName: string,
  route: string,
  price: number
) {
  const supabase = createClient() as any;

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
