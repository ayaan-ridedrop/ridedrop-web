import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChatThread from '@/components/ChatThread';
import PhotoUpload from '@/components/PhotoUpload';
import PinVerify from '@/components/PinVerify';
import ReviewForm from '@/components/ReviewForm';
import DisputeForm from '@/components/DisputeForm';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';
import PayButton from './PayButton';

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
    supabase.from('profiles').select('*').eq('id', booking.sender_id).single(),
    supabase.from('profiles').select('*').eq('id', booking.carrier_id).single(),
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
              {new Date(journey?.departure_at ?? '').toLocaleString('en-GB')}
              {journey?.train_operator ? ` · ${journey.train_operator}` : ''}
            </Row>
            <Row label="Arrival">
              {new Date(journey?.arrival_at ?? '').toLocaleString('en-GB')}
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

          {/* PAY (sender, while accepted + unpaid) */}
          {youAreSender && booking.status === 'accepted' && !booking.stripe_payment_intent_id && (
            <PayButton bookingId={booking.id} priceGbp={booking.agreed_price_pence / 100} />
          )}
          {youAreSender && booking.stripe_payment_intent_id && (
            <div className="bg-accent-light border border-accent-mid rounded-2xl px-5 py-3 text-sm text-accent">
              Paid - funds held in escrow until delivery confirmed
            </div>
          )}
          {youAreCarrier && !booking.stripe_payment_intent_id && booking.status === 'accepted' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3 text-sm text-amber-900">
              Waiting for the sender to pay before you collect.
            </div>
          )}

          {/* PINs FIRST */}
          {['accepted', 'picked_up', 'in_transit', 'delivered'].includes(booking.status) && (
            <div className="bg-accent-light/40 border border-accent-light rounded-2xl p-5">
              <h3 className="font-display font-bold text-lg mb-3">
                Handoff PINs
              </h3>
              {youAreSender ? (
                <>
                  <PinDisplay
                    label="Pickup PIN — read this to the carrier"
                    pin={booking.pickup_pin}
                    used={booking.status !== 'accepted'}
                  />
                  <PinDisplay
                    label="Delivery PIN — give this to your recipient"
                    pin={booking.delivery_pin}
                    used={booking.status === 'delivered' || booking.status === 'completed'}
                  />
                </>
              ) : (
                <>
                  {booking.status === 'accepted' && (
                    <PinVerify bookingId={booking.id} kind="pickup" />
                  )}
                  {['picked_up', 'in_transit'].includes(booking.status) && (
                    <PinVerify bookingId={booking.id} kind="delivery" />
                  )}
                </>
              )}
            </div>
          )}

          {/* PHOTOS SECOND (after PIN verified) */}
          {youAreCarrier && booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <>
              {booking.status === 'picked_up' && (
                <PhotoUpload bookingId={booking.id} kind="pickup" existingUrl={pickupUrl} />
              )}
              {booking.status === 'delivered' && (
                <PhotoUpload bookingId={booking.id} kind="delivery" existingUrl={deliveryUrl} />
              )}
            </>
          )}
          {/* Photos visible read-only to the sender */}
          {youAreSender && (pickupUrl || deliveryUrl) && (
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

          {/* DISPUTE (while active and not already disputed/completed) */}
          {!['completed', 'cancelled', 'disputed'].includes(booking.status) && (
            <DisputeForm bookingId={booking.id} />
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

function PinDisplay({
  label,
  pin,
  used,
}: {
  label: string;
  pin: string | null;
  used: boolean;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div
        className={`font-mono text-3xl tracking-[0.5em] ${
          used ? 'text-ink-muted line-through' : 'text-accent'
        }`}
      >
        {pin ?? '——'}
      </div>
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
