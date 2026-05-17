// Transactional email via Resend (https://resend.com).
//
// Test mode is free and instant — sign up, grab the API key, paste into
// .env.local as `RESEND_API_KEY=re_...`. In test mode emails only deliver
// to the address you signed up with (or whatever you've verified) — which
// is exactly what we want for V1.
//
// In production: verify your sending domain (ridedrop.co.uk) in the Resend
// dashboard and update `FROM`.

import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM ?? 'RideDrop <onboarding@resend.dev>';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (_resend) return _resend;
  _resend = new Resend(key);
  return _resend;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const resend = getResend();
  if (!resend) {
    // Quietly no-op so dev without a Resend key still works.
    console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error('[email] resend error:', error);
  } catch (err) {
    console.error('[email] resend threw:', err);
  }
}

// ── Template helpers ───────────────────────────────────────────────

function wrap(html: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#F7F4EF;padding:24px;color:#0D0D0D;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E8E4DC;border-radius:16px;padding:32px;">
      <div style="font-family:Syne,sans-serif;font-weight:800;font-size:22px;letter-spacing:-1px;margin-bottom:24px;">
        RideDrop<span style="color:#52B788;">.</span>
      </div>
      ${html}
      <hr style="border:0;border-top:1px solid #E8E4DC;margin:24px 0;">
      <p style="font-size:12px;color:#888;margin:0;">
        You're receiving this because you have a RideDrop account.
      </p>
    </div>
  </body></html>`;
}

export const emails = {
  bookingAccepted({
    to,
    senderName,
    carrierName,
    route,
    priceGbp,
    bookingUrl,
  }: {
    to: string;
    senderName: string;
    carrierName: string;
    route: string;
    priceGbp: number;
    bookingUrl: string;
  }) {
    return sendEmail({
      to,
      subject: `${carrierName} accepted your delivery (${route})`,
      html: wrap(`
        <h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;margin:0 0 8px;">
          Your delivery is booked.
        </h2>
        <p>Hi ${senderName},</p>
        <p><strong>${carrierName}</strong> just accepted your delivery on <strong>${route}</strong> for <strong>£${priceGbp.toFixed(2)}</strong>.</p>
        <p>The next step is to pay so the funds go into escrow.</p>
        <p><a href="${bookingUrl}" style="display:inline-block;background:#0D0D0D;color:#fff;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:500;">Pay and continue →</a></p>
      `),
    });
  },

  paymentReceived({
    to,
    carrierName,
    route,
    bookingUrl,
  }: {
    to: string;
    carrierName: string;
    route: string;
    bookingUrl: string;
  }) {
    return sendEmail({
      to,
      subject: `Payment received — ${route}`,
      html: wrap(`
        <h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;margin:0 0 8px;">
          Funds are in escrow.
        </h2>
        <p>Hi ${carrierName},</p>
        <p>The sender just paid for the <strong>${route}</strong> delivery. Funds are held safely until the package is delivered.</p>
        <p><a href="${bookingUrl}" style="display:inline-block;background:#1B4332;color:#fff;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:500;">View booking →</a></p>
      `),
    });
  },

  deliveryConfirmed({
    to,
    name,
    route,
    amountGbp,
    bookingUrl,
  }: {
    to: string;
    name: string;
    route: string;
    amountGbp: number;
    bookingUrl: string;
  }) {
    return sendEmail({
      to,
      subject: `Delivery confirmed — £${amountGbp.toFixed(2)} on its way`,
      html: wrap(`
        <h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;margin:0 0 8px;">
          Delivery confirmed.
        </h2>
        <p>Hi ${name},</p>
        <p>The <strong>${route}</strong> delivery has been confirmed. Your <strong>£${amountGbp.toFixed(2)}</strong> payout is being released to your bank account and should arrive within 24 hours.</p>
        <p><a href="${bookingUrl}" style="display:inline-block;background:#0D0D0D;color:#fff;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:500;">View booking →</a></p>
      `),
    });
  },

  disputeRaised({
    to,
    name,
    route,
    reason,
    bookingUrl,
  }: {
    to: string;
    name: string;
    route: string;
    reason: string;
    bookingUrl: string;
  }) {
    return sendEmail({
      to,
      subject: `Dispute raised on your ${route} booking`,
      html: wrap(`
        <h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;margin:0 0 8px;color:#991B1B;">
          A dispute has been raised.
        </h2>
        <p>Hi ${name},</p>
        <p>A dispute has been raised on the <strong>${route}</strong> booking. Reason: <em>${reason}</em>.</p>
        <p>Funds are frozen while RideDrop support investigates. We'll be in touch within 24 hours.</p>
        <p><a href="${bookingUrl}" style="display:inline-block;background:#991B1B;color:#fff;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:500;">View booking →</a></p>
      `),
    });
  },
};
