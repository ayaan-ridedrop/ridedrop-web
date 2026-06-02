'use client';

import { useState } from 'react';
import { raiseDispute } from '@/lib/actions/raise-dispute';

export default function DisputeForm({ bookingId }: { bookingId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append('bookingId', bookingId);
    fd.append('reason', reason);
    fd.append('description', description);

    const res = await raiseDispute(fd);
    setSubmitting(false);

    if (res && 'error' in res) {
      setError(res.error ?? 'Something went wrong');
    } else {
      setSuccess(true);
      setReason('');
      setDescription('');
      setShowForm(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-sm text-green-900">
        ✓ Dispute raised. Our team will review and get back to you within 48 hours.
      </div>
    );
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-red-600 hover:text-red-700 font-medium underline"
        >
          Raise a dispute
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wider block mb-2">
              Reason for dispute
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Package damaged, Never delivered, Wrong item"
              required
              minLength={5}
              maxLength={100}
              disabled={submitting}
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-ink-muted uppercase tracking-wider block mb-2">
              Details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what happened..."
              maxLength={500}
              rows={3}
              disabled={submitting}
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!reason.trim() || submitting}
              className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit dispute'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="flex-1 border border-red-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
