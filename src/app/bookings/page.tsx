// /bookings — every booking the user is part of (as sender or carrier).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function BookingsListPage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, agreed_price_pence, commission_pence, created_at,
      sender_id, carrier_id,
      jobs!inner(from_station, to_station, package_description),
      journeys!inner(departure_at)
    `)
    .or(`sender_id.eq.${user.id},carrier_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Your bookings</h1>
      <p className="text-ink-soft mb-8 font-light">
        Everything you've accepted or had accepted.
      </p>

      {!bookings?.length ? (
        <div className="bg-white border border-rail rounded-2xl p-8 text-center text-ink-muted">
          No bookings yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b: any) => {
            const youAreSender = b.sender_id === user.id;
            return (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.id}`}
                  className="bg-white border border-rail rounded-2xl p-5 flex items-center justify-between hover:border-ink transition"
                >
                  <div>
                    <div className="font-display font-bold">
                      {b.jobs.from_station} → {b.jobs.to_station}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {b.jobs.package_description}
                    </div>
                    <div className="text-xs text-ink-muted mt-1">
                      {new Date(b.journeys.departure_at).toLocaleString('en-GB')}
                      {' · '}
                      {youAreSender ? 'You are sending' : 'You are carrying'}
                      {' · '}
                      <span className="uppercase tracking-wider">{b.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-extrabold text-accent text-xl">
                      £{((youAreSender
                        ? b.agreed_price_pence
                        : b.agreed_price_pence - b.commission_pence) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {youAreSender ? 'you pay' : 'you earn'}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
