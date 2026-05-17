'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage, validateEmail, validatePassword } from '@/lib/error-messages';
import Alert from '@/components/Alert';

type Role = 'sender' | 'carrier' | 'both';

export default function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('sender');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get('first_name') ?? '').trim();
    const lastName = String(fd.get('last_name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    // Validate
    const errors: Record<string, string> = {};
    if (!firstName) errors.first_name = 'First name is required.';
    if (!lastName) errors.last_name = 'Last name is required.';

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    const supabase  = createClient() as any;
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
        emailRedirectTo: (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/dashboard',
      },
    });

    setLoading(false);

    if (err) {
      const friendlyError = getFriendlyErrorMessage(err.message);
      setError(friendlyError);
      console.error('[signup] error:', err);
      return;
    }

    router.push('/dashboard');
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

      <div>
        <label className="block text-sm font-medium text-ink mb-2">I want to:</label>
        <div className="flex gap-2">
          {(['sender', 'carrier', 'both'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              disabled={loading}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium border transition disabled:opacity-50 ${
                role === r
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink-soft border-rail'
              }`}
            >
              {r === 'sender' ? '📦 Send packages' : r === 'carrier' ? '🚂 Carry packages' : 'Both'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink mb-1">First name</label>
          <input
            name="first_name"
            required
            placeholder="John"
            disabled={loading}
            className={`w-full border rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 ${
              validationErrors.first_name ? 'border-red-300' : 'border-rail'
            }`}
          />
          {validationErrors.first_name && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.first_name}</p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink mb-1">Last name</label>
          <input
            name="last_name"
            required
            placeholder="Doe"
            disabled={loading}
            className={`w-full border rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 ${
              validationErrors.last_name ? 'border-red-300' : 'border-rail'
            }`}
          />
          {validationErrors.last_name && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
          className={`w-full border rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 ${
            validationErrors.email ? 'border-red-300' : 'border-rail'
          }`}
        />
        {validationErrors.email && (
          <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          disabled={loading}
          className={`w-full border rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 ${
            validationErrors.password ? 'border-red-300' : 'border-rail'
          }`}
        />
        {validationErrors.password && (
          <p className="text-xs text-red-600 mt-1">{validationErrors.password}</p>
        )}
        <p className="text-xs text-ink-soft mt-1">Must be at least 8 characters for security.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-white rounded-full px-6 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            Creating account…
          </>
        ) : (
          <>
            Create account <span>→</span>
          </>
        )}
      </button>

      <p className="text-xs text-ink-muted text-center font-light">
        By signing up you agree to our{' '}
        <a href="/terms" className="underline hover:text-ink transition">Terms</a> and{' '}
        <a href="/privacy" className="underline hover:text-ink transition">Privacy Policy</a>.
      </p>
    </form>
  );
}
