/**
 * Stripe reconciliation script
 * Run daily: compares RideDrop ledger against Stripe API
 * Flags any discrepancies for manual review
 *
 * Usage: npx ts-node scripts/reconcile-stripe.ts
 */

import Stripe from 'stripe';
import { createClient } from '../src/lib/supabase/server';
import { findReconciliationIssues } from '../src/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

interface ReconciliationReport {
  timestamp: string;
  ledgerIssues: Array<{ transaction_id: string; issue: string }>;
  stripeIssues: Array<{ payment_intent_id: string; issue: string }>;
  summary: {
    total_ledger_issues: number;
    total_stripe_issues: number;
    total_issues: number;
  };
}

async function reconcile(): Promise<ReconciliationReport> {
  console.log('[reconcile] starting Stripe reconciliation...');
  const supabase = createClient();
  const issues: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    ledgerIssues: [],
    stripeIssues: [],
    summary: {
      total_ledger_issues: 0,
      total_stripe_issues: 0,
      total_issues: 0,
    },
  };

  try {
    // 1. Check ledger for issues (stuck/overdue transactions)
    console.log('[reconcile] checking ledger for issues...');
    const ledgerIssues = await findReconciliationIssues();
    issues.ledgerIssues = ledgerIssues;
    console.log(`[reconcile] found ${ledgerIssues.length} ledger issues`);

    // 2. Check Stripe for unrecorded payments
    console.log('[reconcile] checking Stripe for missing transactions...');
    const stripePaymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: {
        gte: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // last 7 days
      },
    });

    for (const intent of stripePaymentIntents.data) {
      if (intent.status !== 'succeeded') continue;

      // Check if we have a transaction for this payment intent
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('stripe_payment_intent_id', intent.id)
        .single();

      if (!transaction) {
        issues.stripeIssues.push({
          payment_intent_id: intent.id,
          issue: `Payment succeeded in Stripe but no transaction in ledger (amount: ${(intent.amount / 100).toFixed(2)} GBP)`,
        });
      }
    }

    console.log(`[reconcile] found ${issues.stripeIssues.length} Stripe issues`);

    // 3. Verify fee calculations
    console.log('[reconcile] verifying fee calculations...');
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount_total, amount_fee, amount_carrier');

    transactions?.forEach((tx) => {
      const sum = tx.amount_fee + tx.amount_carrier;
      if (sum !== tx.amount_total) {
        issues.ledgerIssues.push({
          transaction_id: tx.id,
          issue: `Fee calculation mismatch: fee (${tx.amount_fee}) + carrier (${tx.amount_carrier}) != total (${tx.amount_total})`,
        });
      }
    });

    // 4. Summary
    issues.summary.total_ledger_issues = issues.ledgerIssues.length;
    issues.summary.total_stripe_issues = issues.stripeIssues.length;
    issues.summary.total_issues =
      issues.summary.total_ledger_issues + issues.summary.total_stripe_issues;

    console.log('[reconcile] reconciliation complete');
    console.log(`[reconcile] summary:`, issues.summary);

    if (issues.summary.total_issues > 0) {
      console.warn('[reconcile] ⚠️  issues found, see report below');
      console.log(JSON.stringify(issues, null, 2));

      // TODO: Send email alert to admin
      // TODO: Log to monitoring service (Sentry, etc)
    } else {
      console.log('[reconcile] ✅ no issues found');
    }

    return issues;
  } catch (error) {
    console.error('[reconcile] error during reconciliation:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  reconcile()
    .then((report) => {
      console.log('\n=== RECONCILIATION REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reconciliation failed:', error);
      process.exit(1);
    });
}

export { reconcile };
