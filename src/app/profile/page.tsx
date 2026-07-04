// /profile — manage your own profile. Switch role, edit name etc.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ProfileForm from './ProfileForm';
import { getTrustTier } from '@/lib/get-trust-tier';
import { TrustBadgeLarge } from '@/components/TrustBadge';

export default async function ProfilePage() {
  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const { data: carrierProfile } = await supabase
    .from('carrier_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const trustTier = await getTrustTier(user.id);
  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Your profile</h1>
          <p className="text-ink-soft font-light">
            Update your details and toggle carrier mode.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {trustTier && (
            <TrustBadgeLarge
              tier={trustTier.tier}
              deliveries={trustTier.deliveries}
              rating={trustTier.rating}
            />
          )}
          <div className="flex gap-4">
            <Link
              href="/profile/reviews"
              className="text-sm text-accent underline font-medium hover:text-ink transition"
            >
              Reviews
            </Link>
            {isCarrier && (
              <Link
                href="/profile/earnings"
                className="text-sm text-accent underline font-medium hover:text-ink transition"
              >
                Earnings
              </Link>
            )}
          </div>
        </div>
      </div>

      <ProfileForm
        email={user.email!}
        firstName={profile?.first_name ?? ''}
        lastName={profile?.last_name ?? ''}
        homeCity={profile?.home_city ?? ''}
        role={profile?.role ?? 'sender'}
        idStatus={carrierProfile?.id_verification_status ?? 'unverified'}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </AppShell>
  );
}
