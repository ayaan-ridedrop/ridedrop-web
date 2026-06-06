# Email Notifications Setup

## Overview
RideDrop uses **Resend** (https://resend.com) for transactional emails. The service is already integrated and ready to use.

## Quick Start (Development)

1. **Sign up at Resend**: https://resend.com
2. **Get API key**: Go to https://resend.com/api-keys
3. **Add to `.env.local`**:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. **Test mode**: In test mode, emails only deliver to your signup email. Perfect for MVP.

## Available Email Templates

All templates are in `src/lib/email.ts`:

- `emails.bookingAccepted()` - Carrier accepted, sender should pay
- `emails.paymentReceived()` - Payment received, funds in escrow
- `emails.deliveryConfirmed()` - Delivery complete, payout on the way
- `emails.disputeRaised()` - Dispute notification to both parties

## How to Send

```typescript
import { emails } from '@/lib/email';

// Send when booking is accepted
await emails.bookingAccepted({
  to: sender_email,
  senderName: 'Ayaan',
  carrierName: 'John',
  route: 'London → Manchester',
  priceGbp: 25.00,
  bookingUrl: 'https://ridedrop.com/bookings/...',
});
```

## Integration Points

Add these calls to these server actions:

1. **`src/lib/actions/accept-bid.ts`** (when bid accepted):
   ```typescript
   await emails.bookingAccepted({...});
   ```

2. **`src/lib/actions/verify-pin.ts`** (when payment confirmed):
   ```typescript
   await emails.paymentReceived({...});
   ```

3. **`src/lib/actions/confirm-delivery.ts`** (when delivery confirmed):
   ```typescript
   await emails.deliveryConfirmed({...});
   ```

4. **`src/lib/actions/raise-dispute.ts`** (when dispute raised):
   ```typescript
   await emails.disputeRaised({...});
   ```

## Production Setup

1. Verify your domain (ridedrop.co.uk) in Resend
2. Update `FROM` in `src/lib/email.ts`:
   ```typescript
   const FROM = 'noreply@ridedrop.co.uk';
   ```
3. Set `RESEND_API_KEY` in production env

## Testing

Without RESEND_API_KEY, the app will:
- Continue to work normally
- Log email send attempts to console
- Not actually send emails

This allows development without email service. Enable Resend anytime by adding the API key.
