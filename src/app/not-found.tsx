// Branded 404 page. Without this, Next.js shows its bare default "404 — This
// page could not be found" on a white screen. This keeps lost visitors on-brand
// and points them back to something useful.

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-cream">
      <div className="max-w-md text-center">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-8">
          <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <p className="text-6xl font-display font-bold mb-3">404</p>
        <h1 className="text-2xl mb-3">This page took a wrong turn</h1>
        <p className="text-ink-soft mb-8">
          We couldn&apos;t find what you were looking for. It may have moved, or
          the link might be out of date.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-ink text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-accent transition"
          >
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-ink-soft hover:text-ink px-5 py-2.5"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
