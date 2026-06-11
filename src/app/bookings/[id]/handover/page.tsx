'use client';

// src/app/bookings/[id]/handover/page.tsx  (v3 — two-PIN flow)
// Carrier-facing. Works for BOTH stages:
//   booking status 'accepted'              → pickup confirmation (sender's pickup PIN)
//   booking status 'picked_up'/'in_transit' → delivery confirmation (recipient's delivery PIN)
// Photo (camera-forced) + GPS + PIN each time. RPCs do the state changes.

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDelivered } from '@/lib/actions/notify-booking-event';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

type Stage = 'loading' | 'pickup' | 'delivery' | 'done' | 'blocked';

export default function HandoverPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('loading');
  const [blockedMsg, setBlockedMsg] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select('status, paid_at')
        .eq('id', bookingId)
        .single();
      if (bErr || !b) {
        setStage('blocked');
        setBlockedMsg('Booking not found.');
        return;
      }
      if (b.status === 'accepted') {
        if (!b.paid_at) {
          setStage('blocked');
          setBlockedMsg('The sender has not completed payment yet. Pickup unlocks once payment is in escrow.');
          return;
        }
        setStage('pickup');
      } else if (b.status === 'picked_up' || b.status === 'in_transit') {
        setStage('delivery');
      } else if (b.status === 'delivered' || b.status === 'completed') {
        setStage('done');
      } else {
        setStage('blocked');
        setBlockedMsg(`Nothing to confirm — booking is ${b.status}.`);
      }
    })();
  }, [bookingId]);

  function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  function getPosition(): Promise<{ lat: number | null; lng: number | null }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({ lat: null, lng: null }), // GPS optional, never blocks
        { timeout: 5000 },
      );
    });
  }

  async function confirm() {
    if (!photo || pin.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // 1. upload photo
      const ext = photo.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${bookingId}-${stage}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('handover-photos')
        .upload(path, photo, { contentType: photo.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('handover-photos').getPublicUrl(path);

      // 2. GPS (best effort)
      const { lat, lng } = await getPosition();

      // 3. verify PIN + flip state server-side
      const fn = stage === 'pickup' ? 'confirm_pickup' : 'confirm_delivery';
      const { data, error: rpcErr } = await supabase.rpc(fn, {
        p_booking_id: bookingId,
        p_pin: pin,
        p_photo_url: urlData.publicUrl,
        p_lat: lat,
        p_lng: lng,
      });
      if (rpcErr) throw rpcErr;
      if (data !== true) {
        setError(
          stage === 'pickup'
            ? 'Wrong PIN. Ask the sender for the pickup code.'
            : 'Wrong PIN. Ask the recipient for the delivery code.',
        );
        setPin('');
        return;
      }

      if (stage === 'pickup') {
        // reset for the delivery leg later
        setPhoto(null);
        setPreview(null);
        setPin('');
        setStage('delivery');
        setError(null);
        alert('Pickup confirmed — safe travels! Open this page again at delivery.');
        router.push('/dashboard');
      } else {
        setStage('done');
        // email sender (dispute window) + carrier (payout pending) — fire-and-forget
        notifyDelivered(bookingId).catch(() => {});
      }
    } catch (e: unknown) {
      const raw =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Something went wrong. Try again.';
      const friendly = getFriendlyErrorMessage(raw);
      setError(friendly.message || raw);
    } finally {
      setBusy(false);
    }
  }

  const heading =
    stage === 'pickup' ? 'Confirm pickup' : stage === 'delivery' ? 'Confirm delivery' : 'Handover';
  const pinHint =
    stage === 'pickup'
      ? 'Ask the sender for the 6-digit pickup PIN.'
      : 'Ask the recipient for the 6-digit delivery PIN.';

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">{heading}</h1>

      {stage === 'loading' && <p className="mt-6 text-neutral-500">Loading…</p>}

      {stage === 'blocked' && (
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{blockedMsg}</p>
      )}

      {(stage === 'pickup' || stage === 'delivery') && (
        <section className="mt-6 space-y-4">
          <p className="text-sm text-neutral-600">
            Take a photo of the parcel {stage === 'pickup' ? 'at pickup' : 'at handover'}, then
            enter the PIN. {pinHint}
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPhotoPicked}
          />

          {preview ? (
            <img
              src={preview}
              alt="Handover photo preview"
              className="w-full rounded-xl border border-neutral-200 object-cover"
            />
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500"
            >
              Tap to take photo
            </button>
          )}

          {preview && (
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full rounded-lg border border-neutral-300 py-2 text-sm font-medium"
              disabled={busy}
            >
              Retake photo
            </button>
          )}

          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-xl border border-neutral-300 py-4 text-center text-3xl tracking-[0.5em]"
            placeholder="••••••"
          />

          <button
            onClick={confirm}
            disabled={busy || !photo || pin.length !== 6}
            className="w-full rounded-lg bg-neutral-900 py-3 font-medium text-white disabled:opacity-50"
          >
            {busy
              ? 'Confirming…'
              : stage === 'pickup'
                ? 'Confirm pickup'
                : 'Confirm delivery'}
          </button>
        </section>
      )}

      {stage === 'done' && (
        <section className="mt-6 space-y-4 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-semibold">Delivery confirmed</h2>
          <p className="text-sm text-neutral-600">
            Your earnings will be released after the 24-hour confirmation window.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-lg bg-neutral-900 py-3 font-medium text-white"
          >
            Back to dashboard
          </button>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
    </main>
  );
}
