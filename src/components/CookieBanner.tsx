'use client';

// Minimal UK-GDPR cookie consent banner.
// Stores choice in localStorage so we don't re-prompt. Emits a custom event
// that analytics scripts can listen for if you add them later.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'ridedrop.cookie-consent';

type Choice = 'accepted' | 'rejected';

export default function CookieBanner() {
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Choice | null;
    if (saved === 'accepted' || saved === 'rejected') setChoice(saved);
  }, []);

  function decide(next: Choice) {
    localStorage.setItem(STORAGE_KEY, next);
    setChoice(next);
    window.dispatchEvent(new CustomEvent('ridedrop:cookie-consent', { detail: next }));
  }

  if (choice) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-ink text-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <p className="text-sm font-light leading-relaxed flex-1">
          RideDrop uses a small number of cookies — strictly necessary ones for
          signing you in, and optional analytics so we can see what's working.
          Read more in our{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={() => decide('rejected')}
            className="text-sm text-white/70 hover:text-white px-4 py-2 flex-1 md:flex-none"
          >
            Reject optional
          </button>
          <button
            onClick={() => decide('accepted')}
            className="bg-accent-mid text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-accent transition flex-1 md:flex-none"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
