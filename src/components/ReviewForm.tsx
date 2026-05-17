'use client';

import { useState } from 'react';
import { leaveReview } from '@/lib/actions/leave-review';

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
  const [error, setError] = useState<string | null>(null);
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
    if (res && 'error' in res) setError(res.error);
    else setDone(true);
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
        className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid text-sm"
      />
      <div className="text-xs text-ink-muted mt-1">{body.length}/500</div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 bg-ink text-white rounded-full px-5 py-2.5 font-medium hover:bg-accent transition disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
