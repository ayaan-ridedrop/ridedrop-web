'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get('email') ?? ''),
      name: String(fd.get('name') ?? ''),
      city: String(fd.get('city') ?? ''),
      role_interest: String(fd.get('role_interest') ?? 'sender'),
      source: 'landing',
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Something went wrong');
      setStatus('ok');
    } catch (err) {
      setStatus('err');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="max-w-md mx-auto bg-accent-mid/15 border border-accent-mid text-accent-mid rounded-xl px-6 py-4">
        You're on the list. We'll be in touch the moment RideDrop launches in your city.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto flex flex-col gap-3">
      <div className="flex gap-2 justify-center mb-2">
        <RoleTab name="sender" defaultChecked>I want to send</RoleTab>
        <RoleTab name="carrier">I want to carry</RoleTab>
      </div>
      <input
        name="name"
        required
        placeholder="Your name"
        className="bg-white/5 border border-white/10 rounded-full px-6 py-3.5 text-center text-white placeholder-white/30 focus:border-accent-mid outline-none"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        className="bg-white/5 border border-white/10 rounded-full px-6 py-3.5 text-center text-white placeholder-white/30 focus:border-accent-mid outline-none"
      />
      <input
        name="city"
        placeholder="Your city (e.g. London)"
        className="bg-white/5 border border-white/10 rounded-full px-6 py-3.5 text-center text-white placeholder-white/30 focus:border-accent-mid outline-none"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-accent-mid text-white px-7 py-3.5 rounded-full font-medium hover:bg-accent transition disabled:opacity-50 mt-1"
      >
        {status === 'loading' ? 'Joining…' : 'Join the waitlist →'}
      </button>
      {error && (
        <p className="text-xs text-red-300 mt-1">{error}</p>
      )}
      <p className="text-xs text-white/25 mt-3">
        No spam. No sharing your details. Just a launch notification.
      </p>
    </form>
  );
}

function RoleTab({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name="role_interest"
        value={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="block px-6 py-2.5 rounded-full text-sm border border-white/15 text-white/50 peer-checked:bg-white peer-checked:text-ink peer-checked:border-white transition">
        {children}
      </span>
    </label>
  );
}
