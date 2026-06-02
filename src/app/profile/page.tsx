// /profile — manage your own profile. Switch role, edit name etc.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ProfileForm from './ProfileForm';

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

  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-2">Your profile</h1>
          <p className="text-ink-soft font-light">
            Update your details and toggle carrier mode.
          </p>
        </div>
        {isCarrier && (
          <Link
            href="/profile/earnings"
            className="text-sm text-accent underline font-medium hover:text-ink transition"
          >
            View earnings →
          </Link>
        )}
      </div>

      <ProfileForm
        email={user.email!}
        firstName={profile?.first_name ?? ''}
        lastName={profile?.last_name ?? ''}
        phone={profile?.phone ?? ''}
        homeCity={profile?.home_city ?? ''}
        role={profile?.role ?? 'sender'}
        idStatus={carrierProfile?.id_verification_status ?? 'unverified'}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </AppShell>
  );
}
