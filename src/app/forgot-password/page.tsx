'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/Alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    const supabase = createClient() as any;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
      return;
    }

    setMessage(
      'Check your email for a password reset link. It may take a few minutes to arrive.'
    );
    setEmail('');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-10">
          RideDrop<span className="text-accent-mid">.</span>
        </Link>

        <h1 className="text-3xl mb-2">Reset your password.</h1>
        <p className="text-ink-soft text-sm mb-8 font-light">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          )}
          {message && (
            <Alert type="success" message={message} onDismiss={() => setMessage(null)} />
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white rounded-full px-6 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-ink-soft text-center mt-6 font-light">
          Remember your password?{' '}
          <Link href="/login" className="text-accent underline">
            Sign in instead
          </Link>
        </p>
      </div>
    </main>
  );
}
