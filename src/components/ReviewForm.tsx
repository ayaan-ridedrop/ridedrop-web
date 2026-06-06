'use client';

import { useState } from 'react';
import { leaveReview } from '@/lib/actions/leave-review';
import { LoadingSpinner } from './LoadingSpinner';

export default function ReviewForm({
  bookingId,
  subjectName,
}: {
  bookingId: string;
  subjectName: string;
}) {
  const [rating, setRating] = useState<number>(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="bg-accent-light border border-accent-mid text-accent rounded-2xl p-5 text-sm">
        Thanks for the review.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append('bookingId', bookingId);
    fd.append('rating', String(rating));
    if (body.trim()) fd.append('body', body.trim());
    const res = await leaveReview(fd);
    setSubmitting(false);
    if (res && 'error' in res) {
      setError({
        message: res.error ?? 'Something went wrong',
        hint: res.hint,
      });
    } else {
      setDone(true);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-rail rounded-2xl p-5">
      <h3 className="font-display font-bold text-lg mb-1">
        Rate {subjectName}
      </h3>
      <p className="text-sm text-ink-soft font-light mb-4">
        How did it go? Your review helps everyone on RideDrop.
      </p>
      <div className="flex gap-1 mb-4 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`transition ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder="Optional — what stood out?"
        rows={3}
        disabled={submitting}
        className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid text-sm disabled:opacity-50 transition"
      />
      <div className="text-xs text-ink-muted mt-1">{body.length}/500</div>
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-red-700">{error.message}</p>
          {error.hint && <p className="text-xs text-red-600 mt-1">{error.hint}</p>}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full bg-ink text-white rounded-full px-5 py-4 sm:py-2.5 font-medium hover:bg-accent transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] sm:min-h-auto"
      >
        {submitting ? (
          <>
            <LoadingSpinner size="sm" inline />
            Submitting...
          </>
        ) : (
          'Submit review'
        )}
      </button>
    </form>
  );
}
