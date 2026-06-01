import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const metadata = {
  title: 'Admin | RideDrop',
};

export default async function AdminPage() {
  const supabase = createClient() as any;

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/login');
  }

  // Fetch all disputes with related data
  const { data: disputes, error } = await (supabase
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
        carrier_id
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disputes:', error);
  }

  // Fetch user names for raised_by
  const userIds = disputes?.map((d: any) => d.raised_by) || [];
  const { data: profiles } = await (supabase
    .from('profiles') as any)
    .select('id, first_name, last_name')
    .in('id', userIds);

  const profileMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = `${p.first_name} ${p.last_name}`.trim() || 'Unknown';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin/verify-tickets"
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Verify Train Tickets</h3>
                <p className="text-sm text-blue-700 mt-1">Review pending carrier tickets</p>
              </div>
              <span className="text-2xl">🎫</span>
            </div>
          </Link>

          <Link
            href="#disputes"
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Resolve Disputes</h3>
                <p className="text-sm text-yellow-700 mt-1">Handle user disputes</p>
              </div>
              <span className="text-2xl">⚖️</span>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow" id="disputes">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Disputes</h2>
          </div>

          {!disputes || disputes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No disputes found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Raised By
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Amount (£)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {disputes.map((dispute: any) => (
                    <tr key={dispute.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {dispute.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {profileMap[dispute.raised_by] || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {dispute.reason}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        £{(dispute.bookings?.agreed_price_pence / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dispute.status)}`}>
                          {dispute.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/disputes/${dispute.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
