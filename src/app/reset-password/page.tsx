'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/Alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // On mount, check if recovery token is in URL and verify it
    const verifyRecoveryToken = async () => {
      const supabase = createClient() as any;

      // Supabase automatically handles the token from the URL fragment
      // Just verify we have a valid session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        setError('Invalid or expired recovery link. Please request a new one.');
        console.error('Session error:', sessionErr);
        return;
      }

      if (!session) {
        setError('Invalid or expired recovery link. Please request a new one.');
        return;
      }

      setSessionReady(true);
    };

    verifyRecoveryToken();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!sessionReady) {
      setError('Session not ready. Please try again.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const supabase = createClient() as any;
    const { error: err } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
      console.error('Password update error:', err);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-10">
          <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
        </Link>

        <h1 className="text-3xl mb-2">Create a new password.</h1>
        <p className="text-ink-soft text-sm mb-8 font-light">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white rounded-full px-6 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset password'}
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
