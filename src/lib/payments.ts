// src/lib/payments.ts
// Pure business logic for money + state. No Supabase, no Stripe —
// fully unit-testable. Stripe plugs into this later without changes.

import type { TransactionStatus } from '@/types/payments';

/** Platform commission: 20%. Change here, nowhere else. */
export const PLATFORM_FEE_PERCENT = 20;

/**
 * Split a total (in pence) into platform fee + carrier amount.
 * Fee is rounded DOWN so rounding always favours the carrier
 * (cheap goodwill, avoids 1p complaints) and amounts always add up.
 */
export function splitAmount(amountTotalPence: number): {
  amount_total: number;
  amount_fee: number;
  amount_carrier: number;
} {
  if (!Number.isInteger(amountTotalPence) || amountTotalPence <= 0) {
    throw new Error('amount must be a positive integer in pence');
  }
  const amount_fee = Math.floor((amountTotalPence * PLATFORM_FEE_PERCENT) / 100);
  return {
    amount_total: amountTotalPence,
    amount_fee,
    amount_carrier: amountTotalPence - amount_fee,
  };
}

/** Pence → "£12.50" */
export function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

/** Dispute window after PIN release before payout fires. */
export const RELEASE_DELAY_HOURS = 24;

/** The only legal state transitions. Anything else is a bug. */
const TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  pending: ['held', 'refunded'],
  held: ['released', 'disputed', 'refunded'],
  released: ['paid_out', 'disputed'],
  disputed: ['paid_out', 'refunded'],
  paid_out: [],
  refunded: [],
};

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws on illegal transitions — call before every status update. */
export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal transaction transition: ${from} → ${to}`);
  }
}

/** Is a released transaction past its dispute window and due for payout? */
export function isPayoutDue(releasedAt: string | Date, now: Date = new Date()): boolean {
  const released = new Date(releasedAt).getTime();
  return now.getTime() - released >= RELEASE_DELAY_HOURS * 60 * 60 * 1000;
}

/** SHA-256 hex of a file in the browser — duplicate-photo fraud flag. */
export async function sha256OfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
