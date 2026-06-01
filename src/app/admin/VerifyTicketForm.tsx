'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';

interface VerifyTicketFormProps {
  journeyId: string;
  fromStation: string;
  toStation: string;
  departureAt: string;
  trainOperator: string | null;
}

export default function VerifyTicketForm({
  journeyId,
  fromStation,
  toStation,
  departureAt,
  trainOperator,
}: VerifyTicketFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  async function handleApprove() {
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to approve ticket');
        return;
      }

      setSuccessMessage('✓ Ticket approved. Journey is now listed.');
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Error approving ticket:', err);
      setError('An error occurred while approving the ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectionNotes.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          action: 'reject',
          notes: rejectionNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to reject ticket');
        return;
      }

      setSuccessMessage('✓ Ticket rejected. Carrier has been notified.');
      setRejectionNotes('');
      setShowRejectionForm(false);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Error rejecting ticket:', err);
      setError('An error occurred while rejecting the ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {!showRejectionForm ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Processing…' : '✓ Approve'}
          </button>

          <button
            type="button"
            onClick={() => setShowRejectionForm(true)}
            disabled={submitting}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <label className="block">
            <span className="text-sm font-medium text-red-900 block mb-2">
              Reason for rejection
            </span>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              disabled={submitting}
              placeholder="e.g., Ticket date doesn't match journey date, or passenger name not visible..."
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
              rows={3}
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting || !rejectionNotes.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing…' : 'Confirm rejection'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRejectionForm(false);
                setRejectionNotes('');
                setError(null);
              }}
              disabled={submitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
