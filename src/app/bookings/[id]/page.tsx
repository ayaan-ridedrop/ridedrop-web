// /bookings/[id] — the workhorse page where the whole delivery happens.
// Stages: accepted → picked_up → in_transit → delivered → completed.
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

  // Fetch the booking first (simpler query)
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (bookingErr || !booking) {
    console.error('[booking detail] booking fetch error:', bookingErr, 'booking:', booking);
    notFound();
  }

  // Fetch job details
  const { data: job } = await supabase
    .from('jobs')
    .select('from_station, to_station, package_description, package_size, package_weight_kg, must_arrive_by, declared_value_pence')
    .eq('id', booking.job_id)
    .maybeSingle();

  // Fetch journey details
  const { data: journey } = await supabase
    .from('journeys')
    .select('departure_at, arrival_at, train_operator, train_number')
    .eq('id', booking.journey_id)
    .maybeSingle();

  // Fetch sender profile
  const { data: sender } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', booking.sender_id)
    .maybeSingle();

  // Fetch carrier profile
  const { data: carrier } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', booking.carrier_id)
    .maybeSingle();

  // Restructure data to match original format
  const bookingData = {
    ...booking,
    jobs: job,
    journeys: journey,
    sender,
    carrier,
  } as any;

  const b = bookingData;
  const youAreSender = b.sender_id === user.id;
  const youAreCarrier = b.carrier_id === user.id;
  if (!youAreSender && !youAreCarrier) notFound();

  const other = youAreSender ? b.carrier : b.sender;
  const otherName = `${other?.first_name ?? ''} ${other?.last_name?.[0] ?? ''}.`.trim();

  // Fetch existing chat messages.
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', b.id)
    .order('created_at', { ascending: true });

  // Has the current user already left a review?
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', b.id)
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
  const pickupUrl = await signed(b.pickup_photo_url);
  const deliveryUrl = await signed(b.delivery_photo_url);

  const STAGES = [
    { key: 'accepted', label: 'Accepted' },
    { key: 'picked_up', label: 'Picked up' },
    { key: 'in_transit', label: 'In transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
  ] as const;
  const currentStageIdx = STAGES.findIndex((s) => s.key === b.status);

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/bookings" className="text-sm text-accent underline">
        ← All bookings
      </Link>
      <h1 className="text-4xl mt-4 mb-1">
        {b.jobs.from_station} → {b.jobs.to_station}
      </h1>
      <p className="text-ink-soft mb-6 font-light">{b.jobs.package_description}</p>

      {/* PROGRESS TRACK */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div
                className={`h-2 rounded-full ${
                  b.status === 'disputed'
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
        {b.status === 'disputed' && (
          <p className="text-sm text-red-700 mt-3">
            ⚠ This booking is under dispute. Funds are frozen.
          </p>
        )}
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white border border-rail rounded-2xl p-6 mb-8">
        <h3 className="text-sm text-ink-muted uppercase tracking-wider mb-4">
          {youAreSender ? 'Your carrier' : 'Sender'}
        </h3>
        <div className="flex items-center gap-4">
          {other?.avatar_url ? (
            <img src={other.avatar_url} alt={otherName} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-rail flex items-center justify-center text-ink-muted">
              No photo
            </div>
          )}
          <div>
            <div className="font-display font-bold text-lg">{otherName}</div>
            <div className="text-sm text-ink-soft">Verified user</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4">
          {/* SUMMARY */}
          <div className="bg-white border border-rail rounded-2xl p-5 space-y-3 text-sm">
            <Row label={youAreSender ? 'Carrier' : 'Sender'}>{otherName}</Row>
            <Row label="Train">
              {new Date(b.journeys.departure_at).toLocaleString('en-GB')}
              {b.journeys.train_operator ? ` · ${b.journeys.train_operator}` : ''}
            </Row>
            <Row label="Arrival">
              {new Date(b.journeys.arrival_at).toLocaleString('en-GB')}
            </Row>
            <Row label="Agreed price">
              £{(b.agreed_price_pence / 100).toFixed(2)}
            </Row>
            {youAreCarrier && (
              <Row label="You earn (after 20%)">
                £{((b.agreed_price_pence - b.commission_pence) / 100).toFixed(2)}
              </Row>
            )}
            <Row label="Package size">{b.jobs.package_size}</Row>
            {b.jobs.declared_value_pence > 0 && (
              <Row label="Declared value">
                £{(b.jobs.declared_value_pence / 100).toFixed(2)}
              </Row>
            )}
          </div>

          {/* PAY (sender, while accepted + unpaid) */}
          {youAreSender && b.status === 'accepted' && !b.stripe_payment_intent_id && (
            <PayButton bookingId={b.id} priceGbp={b.agreed_price_pence / 100} />
          )}
          {youAreSender && b.stripe_payment_intent_id && (
            <div className="bg-accent-light border border-accent-mid rounded-2xl px-5 py-3 text-sm text-accent">
              Paid - funds held in escrow until delivery confirmed
            </div>
          )}
          {youAreCarrier && !b.stripe_payment_intent_id && b.status === 'accepted' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3 text-sm text-amber-900">
              Waiting for the sender to pay before you collect.
            </div>
          )}

          {/* PINs */}
          {b.stripe_payment_intent_id && ['accepted', 'picked_up', 'in_transit'].includes(b.status) && (
            <div className="bg-accent-light/40 border border-accent-light rounded-2xl p-5">
              <h3 className="font-display font-bold text-lg mb-3">
                Handoff PINs
              </h3>
              {youAreSender ? (
                <>
                  <PinDisplay
                    label="Pickup PIN — read this to the carrier"
                    pin={b.pickup_pin}
                    used={b.status !== 'accepted'}
                  />
                  <PinDisplay
                    label="Delivery PIN — give this to your recipient"
                    pin={b.delivery_pin}
                    used={b.status === 'delivered' || b.status === 'completed'}
                  />
                </>
              ) : (
                <>
                  {b.status === 'accepted' && (
                    <PinVerify bookingId={b.id} kind="pickup" />
                  )}
                  {['picked_up', 'in_transit'].includes(b.status) && (
                    <PinVerify bookingId={b.id} kind="delivery" />
                  )}
                </>
              )}
            </div>
          )}

          {/* PHOTOS (carrier-uploaded) */}
          {youAreCarrier && b.status !== 'completed' && b.status !== 'cancelled' && (
            <>
              {['accepted', 'picked_up'].includes(b.status) && (
                <PhotoUpload bookingId={b.id} kind="pickup" existingUrl={pickupUrl} />
              )}
              {['picked_up', 'in_transit', 'delivered'].includes(b.status) && (
                <PhotoUpload bookingId={b.id} kind="delivery" existingUrl={deliveryUrl} />
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
          {youAreSender && b.status === 'delivered' && (
            <ConfirmDeliveryButton
              bookingId={b.id}
              autoReleaseAt={b.auto_release_at}
            />
          )}

          {/* REVIEW (after completed) */}
          {(b.status === 'completed' || b.status === 'delivered') && !existingReview && (
            <ReviewForm bookingId={b.id} subjectName={otherName} />
          )}

          {/* DISPUTE (while active and not already disputed/completed) */}
          {!['completed', 'cancelled', 'disputed'].includes(b.status) && (
            <DisputeForm bookingId={b.id} />
          )}
        </div>

        {/* CHAT */}
        <div>
          <ChatThread
            bookingId={b.id}
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
