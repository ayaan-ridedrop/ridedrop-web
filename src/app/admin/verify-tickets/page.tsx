import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import VerifyTicketForm from '../VerifyTicketForm';

export const metadata = {
  title: 'Verify Tickets | Admin | RideDrop',
};

export default async function VerifyTicketsPage() {
  const supabase = createClient() as any;

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/login');
  }

  // Fetch all pending journeys with carrier info
  const { data: pendingJourneys, error } = await (supabase
    .from('journeys') as any)
    .select(`
      id,
      carrier_id,
      from_station,
      to_station,
      departure_at,
      arrival_at,
      train_operator,
      train_number,
      capacity,
      minimum_price_pence,
      ticket_url,
      created_at,
      status,
      profiles:carrier_id (
        first_name,
        last_name,
        email: id
      )
    `)
    .eq('status', 'ticket_pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending journeys:', error);
  }

  // Fetch user profiles for email mapping
  const carrierIds = pendingJourneys?.map((j: any) => j.carrier_id) || [];
  const { data: profiles } = await (supabase
    .from('profiles') as any)
    .select('id, first_name, last_name')
    .in('id', carrierIds);

  const profileMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = `${p.first_name} ${p.last_name}`.trim() || 'Unknown';
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Verify Train Tickets</h1>
        <p className="text-gray-600 mb-8">Review carrier-uploaded tickets to approve journeys for listing</p>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              Pending Verification ({pendingJourneys?.length || 0})
            </h2>
          </div>

          {!pendingJourneys || pendingJourneys.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No pending tickets</p>
              <p className="text-sm">All journeys have been verified or are already listed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingJourneys.map((journey: any) => (
                <div key={journey.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    {/* Journey details */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Route</p>
                      <p className="text-sm font-medium">
                        {journey.from_station}
                        {' → '}
                        {journey.to_station}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Train: {journey.train_operator || 'Unknown'}
                        {journey.train_number && ` • ${journey.train_number}`}
                      </p>
                    </div>

                    {/* Timing */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Departure</p>
                      <p className="text-sm font-medium">
                        {new Date(journey.departure_at).toLocaleString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Capacity: {journey.capacity} • Min: £{(journey.minimum_price_pence / 100).toFixed(2)}
                      </p>
                    </div>

                    {/* Carrier info */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Carrier</p>
                      <p className="text-sm font-medium">
                        {profileMap[journey.carrier_id] || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Submitted {new Date(journey.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Ticket preview */}
                  {journey.ticket_url && (
                    <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Uploaded ticket:</p>
                      <a
                        href={journey.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        View ticket image
                      </a>
                    </div>
                  )}

                  {/* Verification form */}
                  <VerifyTicketForm
                    journeyId={journey.id}
                    fromStation={journey.from_station}
                    toStation={journey.to_station}
                    departureAt={journey.departure_at}
                    trainOperator={journey.train_operator}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
