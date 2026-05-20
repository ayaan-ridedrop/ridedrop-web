'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import Alert from '@/components/Alert';
import { UK_STATIONS } from '@/lib/types';

export default function SendJobForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [declaration, setDeclaration] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validation
    const errors: Record<string, string> = {};

    const fd = new FormData(e.currentTarget);
    const fromStation = String(fd.get('from_station') ?? '').trim();
    const toStation = String(fd.get('to_station') ?? '').trim();
    const description = String(fd.get('package_description') ?? '').trim();
    const budget = Number(fd.get('budget') ?? 0);

    if (!fromStation) errors.from_station = 'Please choose a pickup station.';
    if (!toStation) errors.to_station = 'Please choose a delivery station.';
    if (fromStation === toStation) errors.to_station = 'Pickup and delivery stations must be different.';
    if (!description) errors.package_description = 'Please describe the package.';
    if (budget < 5) errors.budget = 'Budget must be at least £5.';
    if (!fd.get('must_arrive_by')) errors.must_arrive_by = 'Please tell us when the package needs to arrive.';

    if (!declaration) {
      errors.declaration = 'You must confirm the contents declaration.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);

    const supabase  = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You are not signed in. Please sign in and try again.');
      setSubmitting(false);
      return;
    }

    const { error: err } = await supabase.from('jobs').insert({
      sender_id: user.id,
      from_station: fromStation,
      to_station: toStation,
      must_arrive_by: fd.get('must_arrive_by')
        ? new Date(String(fd.get('must_arrive_by'))).toISOString()
        : null,
      package_description: description,
      package_size: String(fd.get('package_size')) as 'small' | 'medium' | 'large',
      package_weight_kg: fd.get('weight_kg')
        ? Number(fd.get('weight_kg'))
        : null,
      declared_value_pence: Math.round(Number(fd.get('declared_value') ?? 0) * 100),
      max_budget_pence: Math.round(budget * 100),
      declaration_accepted: true,
      status: 'open',
    });

    setSubmitting(false);
    if (err) {
      const friendlyError = getFriendlyErrorMessage(err.message);
      setError(friendlyError);
      console.error('[send job] error:', err);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5 bg-white border border-rail rounded-2xl p-6">
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <Field
        label="Pickup from"
        error={validationErrors.from_station}
      >
        <StationSelect name="from_station" disabled={submitting} />
      </Field>

      <Field
        label="Deliver to"
        error={validationErrors.to_station}
      >
        <StationSelect name="to_station" disabled={submitting} />
      </Field>

      <Field
        label="Must arrive by"
        error={validationErrors.must_arrive_by}
      >
        <input
          name="must_arrive_by"
          type="datetime-local"
          required
          disabled={submitting}
          className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50 ${
            validationErrors.must_arrive_by ? 'border-red-300' : 'border-rail'
          }`}
        />
        <p className="text-xs text-ink-soft mt-1">The job will auto-cancel once this date/time passes.</p>
      </Field>

      <Field
        label="What is it?"
        error={validationErrors.package_description}
      >
        <input
          name="package_description"
          required
          placeholder="e.g. Legal documents (envelope)"
          disabled={submitting}
          className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50 ${
            validationErrors.package_description ? 'border-red-300' : 'border-rail'
          }`}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Size">
          <select
            name="package_size"
            defaultValue="small"
            disabled={submitting}
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white disabled:opacity-50"
          >
            <option value="small">Small (fits in bag)</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </Field>
        <Field label="Weight (kg)">
          <input
            name="weight_kg"
            type="number"
            step="0.1"
            min="0"
            placeholder="1.0"
            disabled={submitting}
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
          />
        </Field>
        <Field label="Declared value (£)">
          <input
            name="declared_value"
            type="number"
            min="0"
            placeholder="0"
            disabled={submitting}
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
          />
        </Field>
      </div>

      <Field
        label="Your max budget (£)"
        error={validationErrors.budget}
      >
        <input
          name="budget"
          type="number"
          min="5"
          required
          placeholder="25"
          disabled={submitting}
          className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50 ${
            validationErrors.budget ? 'border-red-300' : 'border-rail'
          }`}
        />
      </Field>

      <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-4 border transition ${
        validationErrors.declaration
          ? 'bg-red-50 border-red-300'
          : 'bg-amber-50 border-amber-300'
      } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input
          type="checkbox"
          checked={declaration}
          onChange={(e) => setDeclaration(e.target.checked)}
          disabled={submitting}
          className="mt-1"
        />
        <span className={`text-sm font-light leading-relaxed ${
          validationErrors.declaration ? 'text-red-900' : 'text-amber-900'
        }`}>
          <strong className="font-semibold">Declaration:</strong> I confirm this
          package does not contain cash, weapons, illegal substances, or
          anything prohibited on public transport. I take full legal
          responsibility for the contents.
        </span>
      </label>

      {validationErrors.declaration && (
        <p className="text-xs text-red-600">You must agree to the declaration to post a job.</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ink text-white rounded-full px-7 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Posting…' : 'Post job'}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`block text-xs uppercase tracking-wider font-medium mb-1.5 ${
        error ? 'text-red-700' : 'text-ink-muted'
      }`}>
        {label}
        {error && ` — ${error}`}
      </span>
      {children}
    </label>
  );
}

function StationSelect({ name, disabled }: { name: string; disabled?: boolean }) {
  return (
    <select
      name={name}
      required
      defaultValue=""
      disabled={disabled}
      className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white disabled:opacity-50"
    >
      <option value="" disabled>Choose a station</option>
      {UK_STATIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
