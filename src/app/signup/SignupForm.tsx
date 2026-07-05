'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import Alert from '@/components/Alert';

export default function SignupForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setPhotoFile(file);
    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

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

    // Profile photo is required — your counterparty uses it to recognise you
    // at the station. (This is a recognition photo, not identity verification.)
    if (!photoFile) {
      setError('Please add a profile photo so your sender or carrier can recognise you at the station.');
      setLoading(false);
      return;
    }
    const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (photoFile.type && !allowedPhotoTypes.includes(photoFile.type)) {
      setError('Profile photo must be a JPEG, PNG or WebP image.');
      setLoading(false);
      return;
    }
    if (photoFile.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5 MB or smaller.');
      setLoading(false);
      return;
    }

    const supabase = createClient() as any;

    // Sign up with Supabase
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authErr) {
      setLoading(false);
      const friendlyError = getFriendlyErrorMessage(authErr.message);
      setError(friendlyError.message);
      console.error('[signup] error:', authErr);
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      setLoading(false);
      setError('Failed to create account. Please try again.');
      return;
    }

    // Upload photo to the private avatars bucket (optional). Path is
    // <userId>/<ts>.jpg so the owner-scoped storage policy accepts it, and we
    // link it to the profile so it actually shows (the old code uploaded to a
    // different bucket and never set avatar_url, so photos never appeared).
    if (photoFile) {
      const fileName = `${userId}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadErr) {
        console.warn('[photo upload] warning:', uploadErr);
        // Don't fail - photo is optional for now
      } else {
        // Link the uploaded object to the profile (bucket-relative path).
        const { error: linkErr } = await supabase
          .from('profiles')
          .update({ avatar_url: fileName })
          .eq('id', userId);
        if (linkErr) console.warn('[photo link] warning:', linkErr);
      }
    }

    setLoading(false);

    // If "Confirm email" is OFF in Supabase, signUp returns an active session —
    // the user is already logged in, so send them straight into the app instead
    // of a dead-end "check your email" page. If confirmation IS required (no
    // session), route them to verify their email.
    if (authData?.session) {
      router.push('/dashboard');
    } else {
      router.push('/auth/verify-email?email=' + encodeURIComponent(email));
    }
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

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Profile photo <span className="text-xs font-normal text-red-500">(required)</span>
        </label>
        <p className="text-xs text-ink-muted mb-2">Upload a clear photo of your face. Your sender or carrier sees it only after a job is accepted, so you can recognise each other at the station.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          disabled={loading}
          className="w-full border border-rail bg-white rounded-xl px-4 py-3 focus:border-accent-mid outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {photoPreview && (
          <div className="mt-3">
            <img src={photoPreview} alt="Profile preview" className="w-32 h-32 rounded-lg object-cover" />
            <p className="text-xs text-green-600 mt-2">Photo selected ✓</p>
          </div>
        )}
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
