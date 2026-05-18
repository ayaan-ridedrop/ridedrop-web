'use client';

import { useState } from 'react';
import { resolveDispute } from '@/lib/actions/resolve-dispute';

export default function DisputeResolutionForm({
  disputeId,
  bookingId,
}: {
  disputeId: string;
  bookingId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    
    try {
      await resolveDispute(formData);
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="bookingId" value={bookingId} />

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Resolution
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="resolution"
              value="refund_sender"
              required
              disabled={loading}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-gray-700">
              <span className="font-semibold">Refund Sender</span>
              <span className="block text-sm text-gray-500">
                Sender gets full refund, carrier receives nothing
              </span>
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="resolution"
              value="pay_carrier"
              disabled={loading}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-gray-700">
              <span className="font-semibold">Pay Carrier</span>
              <span className="block text-sm text-gray-500">
                Booking completed normally, carrier gets paid
              </span>
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="resolution"
              value="split"
              disabled={loading}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-gray-700">
              <span className="font-semibold">Split</span>
              <span className="block text-sm text-gray-500">
                Split funds equally (will need manual Stripe refund)
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
          Resolution Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          placeholder="Explain your decision..."
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">Dispute resolved successfully. Refreshing...</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success}
        className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : success ? 'Done' : 'Submit Resolution'}
      </button>
    </form>
  );
}
