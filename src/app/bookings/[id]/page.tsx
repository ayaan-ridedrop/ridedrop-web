import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChatThread from '@/components/ChatThread';
import BookingPins from '@/components/BookingPins';
import ReviewForm from '@/components/ReviewForm';
import DisputeButton from '@/components/DisputeButton';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';
import PaymentForm from '@/components/PaymentForm';
import LiveTrainTracking from '@/components/LiveTrainTracking';

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch booking first (this should always work due to RLS)
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!booking) notFound();

  // Fetch related data separately to avoid RLS issues with inner joins
  const [{ data: job }, { data: journey }, { data: sender }, { data: carrier }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', booking.job_id).single(),
    supabase.from('journeys').select('*').eq('id', booking.journey_id).single(),
    // Only the fields this page needs — never phone. The counterparty's phone
    // must not be exposed; the app coordinates via in-app chat, not numbers.
    supabase.from('profiles').select('id, first_name, last_name, avatar_url').eq('id', booking.sender_id).single(),
    supabase.from('profiles').select('id, first_name, last_name, avatar_url').eq('id', booking.carrier_id).single(),
  ]);

  const youAreSender = booking.sender_id === user.id;
  const youAreCarrier = booking.carrier_id === user.id;
  if (!youAreSender && !youAreCarrier) notFound();

  const other = youAreSender ? carrier : sender;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const otherName = capitalize(`${other?.first_name ?? ''} ${other?.last_name?.[0] ?? ''}.`.trim());

  // Fetch existing chat messages.
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: true });

  // Has the current user already left a review?
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('reviewer_id', user.id)
    .maybeSingle();

  // Build signed URLs for any uploaded photos.
  async function signed(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage
      .from('package-photos')
      .createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }
  const pickupUrl = await signed(booking.pickup_photo_url);
  const deliveryUrl = await signed(booking.delivery_photo_url);

  const STAGES = [
    { key: 'accepted', label: 'Accepted' },
    { key: 'picked_up', label: 'Picked up' },
    { key: 'in_transit', label: 'In transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
  ] as const;
  const currentStageIdx = STAGES.findIndex((s) => s.key === booking.status);

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/bookings" className="text-sm text-accent underline">
        ← All bookings
      </Link>
      <h1 className="text-4xl mt-4 mb-1">
        {job?.from_station} → {job?.to_station}
      </h1>
      <p className="text-ink-soft mb-6 font-light">{job?.package_description}</p>

      {/* PROGRESS TRACK */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div
                className={`h-2 rounded-full ${
                  booking.status === 'disputed'
                    ? 'bg-red-300'
                    : i <= currentStageIdx
                      ? 'bg-accent'
                      : 'bg-rail'
                }`}
              />
              <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1.5 text-center">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        {booking.status === 'disputed' && (
          <p className="text-sm text-red-700 mt-3">
            ⚠ This booking is under dispute. Funds are frozen.
          </p>
        )}
      </div>

      {/* LIVE TRAIN TRACKING — parcel is paid for and on the move */}
      {booking.paid_at &&
        ['picked_up', 'in_transit'].includes(booking.status) &&
        journey?.from_station &&
        journey?.departure_at && (
          <LiveTrainTracking
            from={journey.from_station}
            to={journey.to_station}
            departureAt={journey.departure_at}
            arrivalAt={journey.arrival_at}
            operator={journey.train_operator}
            carrierName={youAreCarrier ? undefined : otherName}
          />
        )}

      {/* VERIFY IDENTITY (safety check) */}
      {['accepted', 'picked_up', 'in_transit', 'delivered'].includes(booking.status) && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
          <h3 className="text-sm text-blue-900 uppercase tracking-wider font-bold mb-4">
            🔒 Verify identity before handoff
          </h3>
          <div className="flex items-center gap-4">
            {other?.avatar_url ? (
              <img src={other.avatar_url} alt={otherName} className="w-24 h-24 rounded-full object-cover border-2 border-blue-300" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-bold text-2xl">
                ?
              </div>
            )}
            <div>
              <div className="font-display font-bold text-xl text-blue-900">{otherName}</div>
              <div className="text-sm text-blue-800 mt-1">
                {youAreSender ? 'Your carrier will collect the package' : 'You are collecting from the sender'}
              </div>
              <div className="text-xs text-blue-700 mt-2">
                Make sure this matches the person you're meeting.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="col-span-1 space-y-4">
          {/* SUMMARY */}
          <div className="bg-white border border-rail rounded-2xl p-5 space-y-3 text-sm">
            <Row label={youAreSender ? 'Carrier' : 'Sender'}>{otherName}</Row>
            <Row label="Train">
              {journey?.departure_at ? new Date(journey.departure_at).toLocaleString('en-GB') : '—'}
              {journey?.train_operator ? ` · ${journey.train_operator}` : ''}
            </Row>
            <Row label="Arrival">
              {journey?.arrival_at ? new Date(journey.arrival_at).toLocaleString('en-GB') : '—'}
            </Row>
            <Row label="Agreed price">
              £{(booking.agreed_price_pence / 100).toFixed(2)}
            </Row>
            {youAreCarrier && (
              <Row label="You earn (after 20%)">
                £{((booking.agreed_price_pence - booking.commission_pence) / 100).toFixed(2)}
              </Row>
            )}
            <Row label="Package size">{job?.package_size}</Row>
            {job && job.declared_value_pence > 0 && (
              <Row label="Declared value">
                £{(job.declared_value_pence / 100).toFixed(2)}
              </Row>
            )}
          </div>

          {/* PAY (sender, while accepted + unpaid). paid_at is set by the
              Stripe webhook — it is the only source of truth for "paid".
              (stripe_payment_intent_id is set when the form OPENS, so it
              must not be used to decide whether payment is complete.) */}
          {youAreSender && booking.status === 'accepted' && !booking.paid_at && (
            <div className="bg-white border border-rail rounded-2xl p-5">
              <h3 className="font-display font-bold text-lg mb-3">
                Pay £{(booking.agreed_price_pence / 100).toFixed(2)} to confirm
              </h3>
              <PaymentForm
                bookingId={booking.id}
                amountPence={booking.agreed_price_pence}
              />
            </div>
          )}
          {youAreSender && booking.paid_at && (
            <div className="bg-accent-light border border-accent-mid rounded-2xl px-5 py-3 text-sm text-accent">
              Paid - funds held in escrow until delivery confirmed
            </div>
          )}
          {youAreCarrier && !booking.paid_at && booking.status === 'accepted' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3 text-sm text-amber-900">
              Waiting for the sender to pay before you collect.
            </div>
          )}

          {/* HANDOFF PINs — secure v3 flow. PINs are stored hashed; the
              sender sees them exactly once at generation. The carrier
              confirms pickup/delivery (PIN + photo + GPS) on /handover. */}
          {booking.paid_at && ['accepted', 'picked_up', 'in_transit'].includes(booking.status) && (
            <div className="bg-accent-light/40 border border-accent-light rounded-2xl p-5">
              <h3 className="font-display font-bold text-lg mb-3">
                Handoff PINs
              </h3>
              {youAreSender ? (
                booking.pickup_pin ? (
                  <p className="text-sm text-ink-soft">
                    Your PINs were shown once when you generated them. The carrier
                    needs the <strong>pickup PIN</strong> from you in person, and the{' '}
                    <strong>delivery PIN</strong> from your recipient.
                  </p>
                ) : (
                  <BookingPins bookingId={booking.id} />
                )
              ) : booking.pickup_pin ? (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">
                    {booking.status === 'accepted'
                      ? 'At pickup, ask the sender for their pickup PIN, take a photo of the package, and confirm.'
                      : 'At delivery, ask the recipient for the delivery PIN, take a photo, and confirm.'}
                  </p>
                  <Link
                    href={`/bookings/${booking.id}/handover`}
                    className="block w-full bg-ink text-white text-center rounded-full px-5 py-3 font-medium hover:bg-accent transition"
                  >
                    {booking.status === 'accepted' ? 'Confirm pickup →' : 'Confirm delivery →'}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Waiting for the sender to generate handover PINs.
                </p>
              )}
            </div>
          )}

          {/* Handover photos, read-only for both parties */}
          {(pickupUrl || deliveryUrl) && (
            <div className="grid grid-cols-2 gap-3">
              {pickupUrl && <PhotoCard label="Pickup" url={pickupUrl} />}
              {deliveryUrl && <PhotoCard label="Delivery" url={deliveryUrl} />}
            </div>
          )}

          {/* CONFIRM DELIVERY (sender, while in 'delivered') */}
          {youAreSender && booking.status === 'delivered' && (
            <ConfirmDeliveryButton
              bookingId={booking.id}
              autoReleaseAt={booking.auto_release_at}
              hasDeliveryPhoto={!!deliveryUrl}
            />
          )}

          {/* REVIEW (after completed) */}
          {(booking.status === 'completed' || booking.status === 'delivered') && !existingReview && (
            <ReviewForm bookingId={booking.id} subjectName={otherName} />
          )}

          {/* DISPUTE — sender only, before funds are released (RPC enforces).
              Freezes the payout and flags the booking for admin review. */}
          {youAreSender &&
            booking.status === 'delivered' &&
            !booking.funds_released_at && <DisputeButton bookingId={booking.id} />}
          {booking.status === 'disputed' && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3">
              Dispute open — the payout is frozen while we review.
            </p>
          )}
        </div>

        {/* CHAT */}
        <div>
          <ChatThread
            bookingId={booking.id}
            currentUserId={user.id}
            initialMessages={messages ?? []}
            otherName={otherName}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center border-b border-rail/60 last:border-b-0 pb-2 last:pb-0">
      <span className="text-xs text-ink-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

function PhotoCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="bg-white border border-rail rounded-2xl p-3">
      <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
        {label}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="rounded-xl w-full max-h-56 object-cover" />
    </div>
  );
}
