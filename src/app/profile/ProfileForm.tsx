'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserRole, IdVerificationStatus } from '@/lib/types';
import { stubVerifyId } from '@/lib/actions/stub-verify-id';

export default function ProfileForm({
  email,
  firstName,
  lastName,
  phone,
  homeCity,
  role,
  idStatus,
  avatarUrl,
}: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  homeCity: string;
  role: UserRole;
  idStatus: IdVerificationStatus;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(avatarUrl ? `https://gqaouvssvowxdvxfkqfb.supabase.co/storage/v1/object/public/${avatarUrl}` : null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>(role);

  async function uploadPhoto(file: File) {
    setPhotoUploading(true);
    setError(null);
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setPhotoUploading(false);
      return;
    }

    // Upload file to storage
    const fileName = `${user.id}-${Date.now()}`;
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadErr) {
      setError(`Photo upload failed: ${uploadErr.message}`);
      setPhotoUploading(false);
      return;
    }

    // Update profile with avatar URL
    const avatarUrl = `avatars/${fileName}`;
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    setPhotoUploading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    setSavedAt(new Date().toLocaleTimeString('en-GB'));
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase  = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }
    const { error: err } = await supabase
      .from('profiles')
      .update({
        first_name: String(fd.get('first_name') ?? ''),
        last_name: String(fd.get('last_name') ?? ''),
        phone: String(fd.get('phone') ?? '') || null,
        home_city: String(fd.get('home_city') ?? '') || null,
        role: currentRole,
      })
      .eq('id', user.id);

    // If they just turned on carrier mode, make sure a carrier_profiles row exists.
    if (currentRole !== 'sender') {
      await supabase
        .from('carrier_profiles')
        .upsert({ id: user.id }, { onConflict: 'id' });
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString('en-GB'));
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-5 bg-white border border-rail rounded-2xl p-6"
    >
      <div className="text-sm text-ink-muted">
        Signed in as <span className="text-ink">{email}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input
            name="first_name"
            defaultValue={firstName}
            required
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
        <Field label="Last name">
          <input
            name="last_name"
            defaultValue={lastName}
            required
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
      </div>
      <Field label="Phone">
        <input
          name="phone"
          defaultValue={phone}
          placeholder="+44 7700 900000"
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
        />
      </Field>
      <Field label="Home city">
        <input
          name="home_city"
          defaultValue={homeCity}
          placeholder="London"
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
        />
      </Field>

      <div>
        <div className="text-xs text-ink-muted uppercase tracking-wider font-medium mb-1.5">
          Profile photo
        </div>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img src={photoPreview} alt="Your photo" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-rail flex items-center justify-center text-ink-muted">
              No photo
            </div>
          )}
          <button
            type="button"
            disabled={photoUploading}
            onClick={() => fileRef.current?.click()}
            className="text-sm text-accent underline disabled:opacity-50"
          >
            {photoUploading ? 'Uploading…' : 'Upload or change photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
            }}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-ink-muted uppercase tracking-wider font-medium mb-1.5">
          How will you use RideDrop?
        </div>
        <div className="flex gap-2">
          {(['sender', 'carrier', 'both'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setCurrentRole(r)}
              className={`flex-1 rounded-full px-3 py-2 text-sm border transition ${
                currentRole === r
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink-soft border-rail'
              }`}
            >
              {r === 'sender' ? 'Send' : r === 'carrier' ? 'Carry' : 'Both'}
            </button>
          ))}
        </div>
      </div>

      {currentRole !== 'sender' && (
        <div className="bg-cream border border-rail rounded-xl p-4 text-sm">
          <div className="font-medium mb-1">ID verification: {idStatus}</div>
          {idStatus === 'verified' ? (
            <p className="text-accent font-light leading-relaxed">
              ID verified. You can now accept jobs and be paid.
            </p>
          ) : (
            <>
              <p className="text-ink-muted font-light leading-relaxed mb-2">
                Verify your government ID before you can accept jobs. In
                production this opens the Stripe Identity flow. For now,
                this is a stub that flips the flag.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await stubVerifyId();
                  router.refresh();
                }}
                className="text-sm bg-accent text-white rounded-full px-4 py-2 hover:bg-ink transition"
              >
                Verify my ID (demo)
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedAt && <p className="text-sm text-accent-mid">Saved at {savedAt}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-ink text-white rounded-full px-7 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-ink-muted uppercase tracking-wider font-medium mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
