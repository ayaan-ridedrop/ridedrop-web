import Link from 'next/link';

export const metadata = {
  title: 'Verify your email | RideDrop',
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email || 'your email';

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <Link href="/" className="font-display font-extrabold text-2xl">
            <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-rail">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✓</span>
          </div>
          
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-ink-soft text-sm mb-6">
            We sent a confirmation link to <strong>{decodeURIComponent(email)}</strong>. Click it to verify your account and get started.
          </p>

          <div className="bg-accent-light rounded-lg p-4 mb-6">
            <p className="text-xs text-accent-mid font-medium">
              Didn't receive it? Check your spam folder or{' '}
              <button className="underline hover:text-accent font-semibold">
                resend the link
              </button>
            </p>
          </div>

          <Link
            href="/"
            className="block w-full bg-ink text-white rounded-full px-6 py-3 font-medium hover:bg-accent transition"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
