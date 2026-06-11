'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import Alert from '@/components/Alert';
import OperatorPicker from '@/components/OperatorPicker';
import TrainTimePicker from '@/components/TrainTimePicker';
import TicketPhotoUpload from '@/components/TicketPhotoUpload';
import { UK_STATIONS, getSuggestedPrice } from '@/lib/types';

export default function NewJourneyForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [selectedArrival, setSelectedArrival] = useState<string | null>(null);
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

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

    if (!selectedOperator) {
      setError('Please select a train operator.');
      return;
    }

    if (!selectedDeparture || !selectedArrival) {
      setError('Please select a departure time from the list.');
      return;
    }

    if (!ticketPhoto) {
      setError('Please upload a photo of your train ticket for verification.');
      return;
    }

    setSubmitting(true);

    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You are not signed in. Please sign in and try again.');
      setSubmitting(false);
      return;
    }

    // Build datetime strings
    const departure_at = `${departureDate}T${selectedDeparture}:00`;
    const arrival_at = `${departureDate}T${selectedArrival}:00`;

    const capacity = Number(fd.get('capacity') ?? 1);
    const payload = {
      carrier_id: user.id,
      from_station: fromStn,
      to_station: toStn,
      departure_at: new Date(departure_at).toISOString(),
      arrival_at: new Date(arrival_at).toISOString(),
      train_operator: selectedOperator,
      train_number: String(fd.get('train_number') ?? '') || null,
      capacity,
      slots_remaining: capacity,
      minimum_price_pence: Math.round(Number(fd.get('min_price') ?? 0) * 100),
      max_weight_kg: Number(fd.get('max_weight_kg') ?? 5),
      food_ok: fd.get('food_ok') === 'on',
      status: 'ticket_pending',
    };
    console.log('[new journey] payload:', payload);
    const { data: insertedJourney, error: insertErr } = await supabase.from('journeys').insert(payload).select().single();

    // TODO: Store ticket photo in Supabase Storage and link to journey
    // Ticket is validated on form submission but storage is not yet implemented

    let err = insertErr;

    setSubmitting(false);
    if (err) {
      const friendlyError = getFriendlyErrorMessage(err.message);
      // Better error message for constraint violations
      let errorMsg = friendlyError.message;
      if (err.message?.includes('check')) {
        errorMsg = 'Please fill in all required fields correctly (must arrive after departure).';
      }
      setError(errorMsg);
      console.error('[new journey] error details:', err.message, err);
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

      {/* Step 1: Stations */}
      <Field label="From">
        <StationSelect
          name="from_station"
          value={fromStation}
          onChange={(e) => {
            const newFrom = e.target.value;
            setFromStation(newFrom);
            setSelectedOperator('');
            setSelectedDeparture(null);
            setSelectedArrival(null);
            if (newFrom && toStation) {
              setSuggestedPrice(getSuggestedPrice(newFrom, toStation));
            } else {
              setSuggestedPrice(null);
            }
          }}
          disabled={submitting}
        />
      </Field>

      <Field label="To">
        <StationSelect
          name="to_station"
          value={toStation}
          onChange={(e) => {
            const newTo = e.target.value;
            setToStation(newTo);
            setSelectedOperator('');
            setSelectedDeparture(null);
            setSelectedArrival(null);
            if (fromStation && newTo) {
              setSuggestedPrice(getSuggestedPrice(fromStation, newTo));
            } else {
              setSuggestedPrice(null);
            }
          }}
          disabled={submitting}
        />
      </Field>

      {/* Step 2: Date */}
      <Field label="Travel date">
        <input
          type="date"
          value={departureDate}
          onChange={(e) => {
            setDepartureDate(e.target.value);
            setSelectedOperator('');
            setSelectedDeparture(null);
            setSelectedArrival(null);
          }}
          disabled={submitting}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
        />
      </Field>

      {/* Step 3: Operator */}
      {fromStation && toStation && departureDate && (
        <Field label="Train operator">
          <OperatorPicker
            fromStation={fromStation}
            toStation={toStation}
            departureDate={departureDate}
            onSelectOperator={(op) => {
              setSelectedOperator(op);
              setSelectedDeparture(null);
              setSelectedArrival(null);
            }}
            disabled={submitting}
          />
        </Field>
      )}

      {/* Step 4: Departure time */}
      {selectedOperator && (
        <Field label="Select departure time">
          <TrainTimePicker
            fromStation={fromStation}
            toStation={toStation}
            departureDate={departureDate}
            operator={selectedOperator}
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

      {/* Step 5: Details */}
      {selectedDeparture && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Train number (optional)">
              <input
                name="train_number"
                placeholder="e.g. XC123"
                disabled={submitting}
                className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
              />
            </Field>
            <Field label="Capacity (slots)">
              <select
                name="capacity"
                defaultValue="1"
                disabled={submitting}
                className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid bg-white disabled:opacity-50"
              >
                <option>1</option><option>2</option><option>3</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min price (£)">
              <input
                name="min_price"
                type="number"
                min="5"
                required
                defaultValue="15"
                disabled={submitting}
                className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
              />
              {suggestedPrice && (
                <p className="text-xs text-accent mt-1 font-medium">
                  Suggested: £{(suggestedPrice / 100).toFixed(0)}
                </p>
              )}
            </Field>
            <Field label="Max weight (kg)">
              <input
                name="max_weight_kg"
                type="number"
                step="0.5"
                defaultValue="5"
                disabled={submitting}
                className="w-full border border-rail rounded-xl px-4 py-3 outline-none focus:border-accent-mid disabled:opacity-50"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="food_ok" disabled={submitting} />
            I'm happy to carry food items
          </label>

          {/* Step 6: Ticket upload */}
          <Field label="Ticket verification">
            <TicketPhotoUpload
              onPhotoCapture={(photo) => setTicketPhoto(photo)}
              disabled={submitting}
            />
            {ticketPhoto && (
              <div className="mt-2 text-xs text-green-600">
                Ticket photo uploaded and ready for verification
              </div>
            )}
          </Field>

          <p className="text-xs text-ink-muted font-light leading-relaxed">
            Your journey will be <em>pending verification</em> while our team checks your ticket matches this route and time. Typically verified within 2-4 hours.
          </p>

          <button
            type="submit"
            disabled={submitting || !selectedDeparture || !selectedArrival || !ticketPhoto}
            className="w-full bg-ink text-white rounded-full px-7 py-3.5 font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'List journey'}
          </button>
        </>
      )}
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
