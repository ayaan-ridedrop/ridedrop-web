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

    if (!photoFile) {
      setError('Profile photo is required. Please upload a clear photo of your face to continue.');
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

    // Upload photo to Supabase Storage
    const fileName = `${userId}-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadErr) {
      setLoading(false);
      setError('Failed to upload photo. Please try again.');
      console.error('[photo upload] error:', uploadErr);
      return;
    }

    // Photo uploaded successfully - just proceed
    setLoading(false);

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

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Profile photo <span className="text-red-600">*</span> <span className="text-xs font-normal text-red-600">(Required)</span>
        </label>
        <p className="text-xs text-ink-muted mb-2">Upload a clear photo of your face for verification</p>
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
        disabled={loading || !photoFile}
        className="w-full bg-ink text-white rounded-full px-6 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
