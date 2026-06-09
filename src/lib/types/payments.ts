// src/types/payments.ts
// Shared types for the RideDrop payments + delivery proof layer.

export type TransactionStatus =
  | 'pending'   // created, awaiting payment
  | 'held'      // payment captured, in escrow
  | 'released'  // PIN entered, 24h dispute window running
  | 'paid_out'  // transferred to carrier
  | 'disputed'  // sender disputed within window
  | 'refunded'; // refunded to sender

export type JobStatus =
  | 'posted'
  | 'bid_accepted'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'completed'
  | 'cancelled';

export interface Transaction {
  id: string;
  job_id: string;
  sender_id: string;
  carrier_id: string;
  /** All amounts in integer pence. Never floats. */
  amount_total: number;
  amount_fee: number;
  amount_carrier: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  status: TransactionStatus;
  created_at: string;
  held_at: string | null;
  released_at: string | null;
  paid_out_at: string | null;
  refunded_at: string | null;
}

export interface DeliveryProof {
  id: string;
  job_id: string;
  carrier_id: string;
  photo_path: string;
  photo_sha256: string | null;
  pin_verified: boolean;
  created_at: string;
}

export type DisputeStatus = 'open' | 'released' | 'refunded';

export interface Dispute {
  id: string;
  job_id: string;
  transaction_id: string | null;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}
