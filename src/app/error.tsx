// Branded error boundary for the app. Catches unhandled exceptions in a route
// segment and shows a recoverable, on-brand screen instead of Next.js's bare
// default. Must be a Client Component (Next.js requirement for error.tsx).
//
// The error is also reported through our logger so it shows up in monitoring.

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { captureException } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { scope: 'app-error-boundary', digest: error.digest });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-cream">
      <div className="max-w-md text-center">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-8">
          RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <h1 className="text-2xl mb-3">Something went wrong</h1>
        <p className="text-ink-soft mb-8">
          We hit an unexpected error. It&apos;s been logged. You can try again,
          and if it keeps happening, contact support@ridedrop.co.uk.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-ink text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-accent transition"
          >
            Try again
          </button>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink px-5 py-2.5">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
