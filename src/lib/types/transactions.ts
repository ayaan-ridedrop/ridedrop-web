/**
 * Transaction types for RideDrop marketplace payments
 * Defines the payment flow, Stripe integration, and dispute handling
 */

export type TransactionStatus =
  | 'pending'      // awaiting payment
  | 'held'         // payment received, awaiting PIN entry
  | 'released'     // PIN entered, 24h dispute window open
  | 'paid_out'     // 24h window passed, money transferred to carrier
  | 'refunded'     // refunded to sender (dispute or cancellation)
  | 'disputed';    // under manual review

export interface Transaction {
  id: string;
  job_id: string;
  sender_id: string;
  carrier_id: string;

  // Amounts in pence
  amount_total: number;
  amount_fee: number;
  amount_carrier: number;
  currency: 'gbp' | 'eur' | 'usd'; // extensible

  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;

  status: TransactionStatus;

  created_at: string;
  released_at: string | null;
  paid_out_at: string | null;
  refunded_at: string | null;

  dispute_reason: string | null;
  disputed_by_id: string | null;
  disputed_at: string | null;

  notes: string | null;
}

/**
 * Create transaction request (internal API)
 * Sent from API route when payment_intent succeeds
 */
export interface CreateTransactionRequest {
  job_id: string;
  sender_id: string;
  carrier_id: string;
  amount_total: number;
  stripe_payment_intent_id: string;
}

/**
 * Release transaction for payout (PIN entry)
 */
export interface ReleaseTransactionRequest {
  transaction_id: string;
  pin_entered_by: 'carrier'; // extensible
}

/**
 * Dispute transaction (manual review)
 */
export interface DisputeTransactionRequest {
  transaction_id: string;
  reason: string;
  disputed_by_user_id: string;
}

/**
 * Resolve dispute (admin action)
 */
export interface ResolveDisputeRequest {
  transaction_id: string;
  action: 'release_payment' | 'refund_sender';
  notes?: string;
}

/**
 * Stripe webhook payloads
 */
export interface StripePaymentIntentSucceededEvent {
  id: string;
  object: 'event';
  type: 'payment_intent.succeeded';
  data: {
    object: {
      id: string; // payment intent ID
      amount: number; // in cents
      client_secret: string;
      status: 'succeeded';
      // ... other Stripe fields
    };
  };
}

export interface StripeChargeRefundedEvent {
  id: string;
  object: 'event';
  type: 'charge.refunded';
  data: {
    object: {
      id: string;
      refunded: true;
      // ... other fields
    };
  };
}

export type StripeWebhookEvent =
  | StripePaymentIntentSucceededEvent
  | StripeChargeRefundedEvent;

/**
 * Fee calculation (20% commission)
 */
export const FEE_PERCENTAGE = 20;

export function calculateFees(amountPence: number): {
  total: number;
  fee: number;
  carrier: number;
} {
  const fee = Math.round(amountPence * (FEE_PERCENTAGE / 100));
  const carrier = amountPence - fee;
  return {
    total: amountPence,
    fee,
    carrier,
  };
}

/**
 * Transaction state validation
 */
export function isValidStateTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    pending: ['held', 'refunded'],
    held: ['released', 'refunded', 'disputed'],
    released: ['paid_out', 'disputed'],
    paid_out: [], // final state
    refunded: [], // final state
    disputed: ['paid_out', 'refunded'], // manual resolution
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Calculate dispute window expiry (24 hours after release)
 */
export function getDisputeWindowExpiryTime(releasedAt: string): Date {
  return new Date(new Date(releasedAt).getTime() + 24 * 60 * 60 * 1000);
}

export function isDisputeWindowOpen(releasedAt: string): boolean {
  return new Date() < getDisputeWindowExpiryTime(releasedAt);
}
