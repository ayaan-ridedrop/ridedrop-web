import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { resolveDispute } from '@/lib/actions/resolve-dispute';

export const metadata = {
  title: 'Resolve Dispute | Admin | RideDrop',
};

export default async function DisputeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient() as any;

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/login');
  }

  // Fetch dispute with related data
  const { data: dispute } = await (supabase
    .from('disputes') as any)
    .select(`
      id,
      booking_id,
      raised_by,
      reason,
      description,
      status,
      resolution_notes,
      resolved_at,
      created_at,
      bookings!inner (
        id,
        agreed_price_pence,
        status,
        sender_id,
        carrier_id,
        pickup_photo_url,
        delivery_photo_url,
        jobs!inner (
          id,
          package_description,
          from_station,
          to_station
        ),
        journeys!inner (
          id,
          from_station,
          to_station
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-red-600">Dispute not found.</p>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  // Fetch user profiles
  const { data: profiles } = await (supabase
    .from('profiles') as any)
    .select('id, first_name, last_name, role')
    .in('id', [dispute.raised_by, dispute.bookings.sender_id, dispute.bookings.carrier_id]);

  const profileMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = { name: `${p.first_name} ${p.last_name}`.trim() || 'Unknown', role: p.role };
    return acc;
  }, {});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isResolved = dispute.status === 'resolved' || dispute.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
          ← Back to Admin
        </Link>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Dispute Details</h1>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(dispute.status)}`}>
                {dispute.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Dispute Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-gray-600 mb-1">Dispute ID</p>
                <p className="font-mono text-gray-900">{dispute.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-gray-900">{new Date(dispute.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Raised By</p>
                <p className="text-gray-900">
                  {profileMap[dispute.raised_by]?.name} ({profileMap[dispute.raised_by]?.role})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount</p>
                <p className="text-gray-900 font-semibold">
                  £{(dispute.bookings.agreed_price_pence / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Reason and Description */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Reason</p>
                <p className="text-gray-900 font-semibold">{dispute.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">{dispute.description || '(No description provided)'}</p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Booking Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sender</p>
                  <p className="text-gray-900">{profileMap[dispute.bookings.sender_id]?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Carrier</p>
                  <p className="text-gray-900">{profileMap[dispute.bookings.carrier_id]?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Route</p>
                  <p className="text-gray-900">
                    {dispute.bookings.jobs[0]?.from_station} → {dispute.bookings.jobs[0]?.to_station}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Package</p>
                  <p className="text-gray-900">{dispute.bookings.jobs[0]?.package_description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Booking Status</p>
                  <p className="text-gray-900">{dispute.bookings.status}</p>
                </div>
              </div>
            </div>

            {/* Resolution History (if already resolved) */}
            {dispute.resolved_at && (
              <div className="mb-8 pb-8 border-b border-gray-200 bg-green-50 p-4 rounded">
                <h3 className="font-semibold text-lg mb-3">Resolution</h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Resolved At</p>
                  <p className="text-gray-900">{new Date(dispute.resolved_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Resolution Notes</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{dispute.resolution_notes || '(No notes)'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Form (only if not already resolved) */}
        {!isResolved && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Resolve Dispute</h2>
            </div>
            <form action={resolveDispute} className="px-6 py-6">
              <input type="hidden" name="disputeId" value={dispute.id} />
              <input type="hidden" name="bookingId" value={dispute.booking_id} />

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Resolution
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resolution"
                      value="refund_sender"
                      required
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-semibold">Refund Sender</span>
                      <span className="block text-sm text-gray-500">
                        Sender gets full refund, carrier receives nothing
                      </span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resolution"
                      value="pay_carrier"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-semibold">Pay Carrier</span>
                      <span className="block text-sm text-gray-500">
                        Booking completed normally, carrier gets paid
                      </span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resolution"
                      value="split"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-semibold">Split</span>
                      <span className="block text-sm text-gray-500">
                        Split funds equally (will need manual Stripe refund)
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  placeholder="Explain your decision..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Submit Resolution
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
