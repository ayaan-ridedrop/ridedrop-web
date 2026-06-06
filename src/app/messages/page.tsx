import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

type Conversation = {
  bookingId: string;
  otherUser: { id: string; first_name: string; last_name: string; avatar_url?: string } | undefined;
  otherUserId: string;
  route: string;
  status: string;
  latestMessage: string;
  latestMessageTime: string;
  price: number;
};

export const metadata = {
  title: 'Messages | RideDrop',
};

export default async function MessagesPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch all bookings where user is sender OR carrier
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      agreed_price_pence,
      created_at,
      sender_id,
      carrier_id,
      job_id,
      journey_id,
      jobs(from_station, to_station),
      journeys(departure_at)
    `)
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  // Fetch profiles for all other users in bookings
  const otherUserIds = new Set<string>();
  bookings?.forEach((b: any) => {
    if (b.sender_id !== user.id) otherUserIds.add(b.sender_id);
    if (b.carrier_id !== user.id) otherUserIds.add(b.carrier_id);
  });

  const { data: otherProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', Array.from(otherUserIds));

  const profileMap = Object.fromEntries(
    (otherProfiles || []).map((p: any) => [p.id, p])
  );

  // Get latest message for each booking
  const bookingIds = bookings?.map((b: any) => b.id) || [];
  const { data: allMessages } = await supabase
    .from('messages')
    .select('booking_id, body, created_at')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  const latestMessageMap = new Map<string, { body: string; created_at: string }>();
  allMessages?.forEach((m: any) => {
    if (!latestMessageMap.has(m.booking_id)) {
      latestMessageMap.set(m.booking_id, { body: m.body, created_at: m.created_at });
    }
  });

  // Build conversation list
  const conversations = bookings?.map((booking: any) => {
    const otherUserId = booking.sender_id === user.id ? booking.carrier_id : booking.sender_id;
    const otherUser = profileMap[otherUserId];
    const latestMsg = latestMessageMap.get(booking.id);
    const jobRoute = booking.jobs ? `${booking.jobs.from_station} → ${booking.jobs.to_station}` : 'Unknown route';

    return {
      bookingId: booking.id,
      otherUser,
      otherUserId,
      route: jobRoute,
      status: booking.status,
      latestMessage: latestMsg?.body || '(no messages yet)',
      latestMessageTime: latestMsg?.created_at || booking.created_at,
      price: booking.agreed_price_pence / 100,
    };
  }) || [];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB');
  };

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Messages</h1>
        <p className="text-ink-soft">Chat with carriers and senders about your deliveries</p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted text-sm">No messages yet. Accept a bid to start chatting!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv: Conversation) => (
            <Link
              key={conv.bookingId}
              href={`/bookings/${conv.bookingId}`}
              className="block bg-white border border-rail rounded-xl p-4 hover:border-accent transition"
            >
              <div className="flex items-start gap-3 mb-2">
                {conv.otherUser?.avatar_url ? (
                  <img
                    src={conv.otherUser.avatar_url}
                    alt={conv.otherUser.first_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-rail flex items-center justify-center text-ink-muted font-bold flex-shrink-0">
                    {conv.otherUser?.first_name?.[0] || '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm">
                      {conv.otherUser?.first_name} {conv.otherUser?.last_name?.[0]}
                    </div>
                    <div className="text-xs text-ink-muted flex-shrink-0">{formatTime(conv.latestMessageTime)}</div>
                  </div>

                  <div className="text-xs text-ink-muted mb-2">{conv.route}</div>

                  <div className="text-sm text-ink line-clamp-2">{conv.latestMessage}</div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-display font-bold text-accent">£{conv.price.toFixed(2)}</div>
                  <div className="text-xs text-ink-muted capitalize mt-1">{conv.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
