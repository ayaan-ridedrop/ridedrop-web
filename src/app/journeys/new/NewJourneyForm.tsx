'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import Alert from '@/components/Alert';
import TrainTimePicker from '@/components/TrainTimePicker';
import { UK_STATIONS } from '@/lib/types';

export default function NewJourneyForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [selectedArrival, setSelectedArrival] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validation
    const fd = new FormData(e.currentTarget);
    const fromStn = String(fd.get('from_station') ?? '').trim();
    const toStn = String(fd.get('to_station') ?? '').trim();

    if (!fromStn || !toStn) {
      setError('Please select both stations.');
      return;
    }

    if (!departureDate) {
      setError('Please select a travel date.');
      return;
    }

    if (!selectedDeparture || !selectedArrival) {
      setError('Please select a departure time from the list.');
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

    // Build datetime strings
    // Selected times are HH:MM and departureDate is YYYY-MM-DD
    const departure_at = `${departureDate}T${selectedDeparture}:00`;
    const arrival_at = `${departureDate}T${selectedArrival}:00`;

    const capacity = Number(fd.get('capacity') ?? 1);
    const { error: err } = await supabase.from('journeys').insert({
      carrier_id: user.id,
      from_station: fromStn,
      to_station: toStn,
      departure_at: new Date(departure_at).toISOString(),
      arrival_at: new Date(arrival_at).toISOString(),
      train_operator: String(fd.get('train_operator') ?? '') || null,
      train_number: String(fd.get('train_number') ?? '') || null,
      capacity,
      slots_remaining: capacity,
      minimum_price_pence: Math.round(Number(fd.get('min_price') ?? 0) * 100),
      max_weight_kg: Number(fd.get('max_weight_kg') ?? 5),
      food_ok: fd.get('food_ok') === 'on',
      status: 'ticket_pending', // becomes 'listed' once ticket is verified
    });

    setSubmitting(false);
    if (err) {
      const friendlyError = getFriendlyErrorMessage(err.message);
      setError(friendlyError);
      console.error('[new journey] error:', err);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-5 bg-white border border-rail rounded-2xl p-6"
    >
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <Field label="From">
        <StationSelect
          name="from_station"
          value={fromStation}
          onChange={(e) => {
            setFromStation(e.target.value);
            setSelectedDeparture(null);
            setSelectedArrival(null);
          }}
          disabled={submitting}
        />
      </Field>

      <Field label="To">
        <StationSelect
          name="to_station"
          value={toStation}
          onChange={(e) => {
            setToStation(e.target.value);
            setSelectedDeparture(null);
            setSelectedArrival(null);
          }}
          disabled={submitting}
        />
      </Field>

      <Field label="Travel date">
        <input
          type="date"
          value={departureDate}
          onChange={(e) => {
            setDepartureDate(e.target.value);
            setSelectedDeparture(null);
            setSelectedArrival(null);
          }}
          disabled={submitting}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
        />
      </Field>

      {fromStation && toStation && departureDate && (
        <Field label="Select departure time">
          <TrainTimePicker
            fromStation={fromStation}
            toStation={toStation}
            departureDate={departureDate}
            onSelectTime={(dep, arr, duration) => {
              setSelectedDeparture(dep);
              setSelectedArrival(arr);
            }}
            disabled={submitting}
          />
          {selectedDeparture && (
            <p className="text-xs text-green-600 mt-2">
              Selected: {selectedDeparture} → {selectedArrival}
            </p>
          )}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Train operator">
          <input
            name="train_operator"
            placeholder="e.g. Avanti West Coast"
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
        <Field label="Train number / service ID">
          <input
            name="train_number"
            placeholder="optional"
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Capacity (slots)">
          <select
            name="capacity"
            defaultValue="1"
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white"
          >
            <option>1</option><option>2</option><option>3</option>
          </select>
        </Field>
        <Field label="Min price (£)">
          <input
            name="min_price"
            type="number"
            min="5"
            required
            defaultValue="15"
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
        <Field label="Max weight (kg)">
          <input
            name="max_weight_kg"
            type="number"
            step="0.5"
            defaultValue="5"
            className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" name="food_ok" />
        I'm happy to carry food items
      </label>

      <p className="text-xs text-ink-muted font-light leading-relaxed">
        After submitting, your journey will be marked <em>pending verification</em>.
        You'll need to verify your train ticket to go live and start accepting deliveries.
      </p>

      <button
        type="submit"
        disabled={submitting || !selectedDeparture || !selectedArrival}
        className="w-full bg-ink text-white rounded-full px-7 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : 'List journey'}
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

function StationSelect({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}) {
  return (
    <select
      name={name}
      required
      value={value || ''}
      onChange={onChange}
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
