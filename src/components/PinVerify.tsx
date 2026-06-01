'use client';

import { useState } from 'react';
import { verifyPin } from '@/lib/actions/verify-pin';

export default function PinVerify({
  bookingId,
  kind,
}: {
  bookingId: string;
  kind: 'pickup' | 'delivery';
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append('bookingId', bookingId);
    fd.append('kind', kind);
    fd.append('pin', pin);
    const res = await verifyPin(fd);
    setSubmitting(false);
    if (res && 'error' in res) setError(res.error ?? null);
    else setPin('');
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-rail rounded-2xl p-5"
    >
      <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
        Enter the {kind} PIN
      </div>
      <p className="text-sm text-ink-soft font-light mb-3">
        {kind === 'pickup'
          ? 'Ask the sender to read out their 4-digit pickup PIN.'
          : 'Ask the recipient to read out the 4-digit delivery PIN.'}
      </p>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          className="flex-1 text-center font-mono text-2xl tracking-[0.5em] border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
        />
        <button
          type="submit"
          disabled={pin.length !== 4 || submitting}
          className="w-full md:w-auto bg-ink text-white rounded-full px-5 py-3 md:py-2 font-medium hover:bg-accent transition disabled:opacity-50"
        >
          {submitting ? '…' : 'Verify'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  );
}
