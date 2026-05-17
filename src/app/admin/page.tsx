// /admin — RideDrop support dashboard. Gated by ADMIN_EMAILS env var.
// V1 shows open disputes + recent waitlist signups. Phase 2 will add
// user search, account suspension, manual payouts, etc.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import { isAdminEmail } from '@/lib/admin';
import ResolveDisputeForm from './ResolveDisputeForm';

export const metadata = { title: 'Admin · RideDrop' };

export default async function AdminPage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!isAdminEmail(user.email)) {
    return (
      <AppShell user={{ email: user.email!, firstName: null }}>
        <h1 className="text-3xl mb-2">No admin access</h1>
        <p className="text-ink-soft font-light">
          Your email is not on the admin allowlist. Ask Ayaan to add it to{' '}
          <code>ADMIN_EMAILS</code> in the deployment env.
        </p>
      </AppShell>
    );
  }

  // Use the service-role client so we can see waitlist + cross-user data.
  const admin = createServiceClient();

  const [
    { data: openDisputes },
    { data: recentWaitlist, count: waitlistCount },
    { count: totalUsers },
    { count: totalBookings },
  ] = await Promise.all([
    admin
      .from('disputes')
      .select(`
        id, reason, description, status, raised_by, booking_id, created_at,
        bookings!inner(id, status, agreed_price_pence,
          jobs!inner(from_station, to_station, package_description),
          sender:profiles!bookings_sender_id_fkey(first_name, last_name),
          carrier:profiles!bookings_carrier_id_fkey(first_name, last_name))
      `)
      .in('status', ['open', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('waitlist')
      .select('email, name, city, role_interest, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('bookings').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <AppShell user={{ email: user.email!, firstName: 'Admin' }}>
      <h1 className="text-4xl mb-2">RideDrop operations</h1>
      <p className="text-ink-soft mb-8 font-light">
        Internal view — only people on <code>ADMIN_EMAILS</code> can see this.
      </p>

      {/* Top-line counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Users" value={String(totalUsers ?? 0)} />
        <Stat label="Bookings" value={String(totalBookings ?? 0)} />
        <Stat label="Waitlist" value={String(waitlistCount ?? 0)} />
        <Stat
          label="Open disputes"
          value={String(openDisputes?.length ?? 0)}
          warn={(openDisputes?.length ?? 0) > 0}
        />
      </div>

      {/* DISPUTES */}
      <h2 className="text-2xl mb-4">Open disputes</h2>
      {!openDisputes?.length ? (
        <p className="text-ink-muted text-sm font-light mb-10">
          No open disputes. 🎉
        </p>
      ) : (
        <ul className="space-y-3 mb-10">
          {openDisputes.map((d: any) => (
            <li
              key={d.id}
              className="bg-white border border-rail rounded-2xl p-5"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <div className="font-display font-bold">
                    {d.bookings.jobs.from_station} → {d.bookings.jobs.to_station}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {d.bookings.jobs.package_description} · £
                    {(d.bookings.agreed_price_pence / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    Sender: {d.bookings.sender.first_name}{' '}
                    {d.bookings.sender.last_name?.[0]}. · Carrier:{' '}
                    {d.bookings.carrier.first_name}{' '}
                    {d.bookings.carrier.last_name?.[0]}.
                  </div>
                </div>
                <Link
                  href={`/bookings/${d.bookings.id}`}
                  className="text-sm text-accent underline shrink-0"
                >
                  View booking →
                </Link>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm">
                <div className="font-medium text-red-900 mb-1">{d.reason}</div>
                {d.description && (
                  <p className="text-red-800 font-light">{d.description}</p>
                )}
                <div className="text-xs text-red-700 mt-2">
                  Raised {new Date(d.created_at).toLocaleString('en-GB')}
                </div>
              </div>
              <ResolveDisputeForm disputeId={d.id} bookingId={d.bookings.id} />
            </li>
          ))}
        </ul>
      )}

      {/* WAITLIST */}
      <h2 className="text-2xl mb-4">Recent waitlist signups</h2>
      {!recentWaitlist?.length ? (
        <p className="text-ink-muted text-sm font-light">No signups yet.</p>
      ) : (
        <div className="bg-white border border-rail rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream text-ink-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">City</th>
                <th className="text-left px-4 py-3">Wants to</th>
              </tr>
            </thead>
            <tbody>
              {recentWaitlist.map((w: any) => (
                <tr key={w.email} className="border-t border-rail">
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(w.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">{w.email}</td>
                  <td className="px-4 py-3">{w.name ?? '—'}</td>
                  <td className="px-4 py-3">{w.city ?? '—'}</td>
                  <td className="px-4 py-3">{w.role_interest ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        warn ? 'bg-red-50 border-red-200' : 'bg-white border-rail'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-2">
        {label}
      </div>
      <div
        className={`font-display font-extrabold text-2xl ${
          warn ? 'text-red-700' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}
