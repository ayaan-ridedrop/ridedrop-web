'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import Alert from '@/components/Alert';

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email')).trim();
    const password = String(fd.get('password'));
    const confirmPassword = String(fd.get('confirmPassword'));
    const firstName = String(fd.get('firstName')).trim();
    const lastName = String(fd.get('lastName')).trim();

    // Basic validation
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const supabase = createClient() as any;
    
    // Sign up with Supabase
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    setLoading(false);

    if (err) {
      const friendlyError = getFriendlyErrorMessage(err.message);
      setError(friendlyError);
      console.error('[signup] error:', err);
      return;
    }

    // Redirect to verify email page
    router.push('/auth/verify-email?email=' + encodeURIComponent(email));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">First name</label>
        <input
          name="firstName"
          type="text"
          required
          placeholder="John"
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">Last name</label>
        <input
          name="lastName"
          type="text"
          required
          placeholder="Doe"
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">Password</label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-ink-muted">At least 8 characters</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">Confirm password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          placeholder="••••••••"
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-white rounded-full px-6 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
