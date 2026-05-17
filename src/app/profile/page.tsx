// /profile — manage your own profile. Switch role, edit name etc.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = createClient();
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

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Your profile</h1>
      <p className="text-ink-soft mb-8 font-light">
        Update your details and toggle carrier mode.
      </p>
      <ProfileForm
        email={user.email!}
        firstName={profile?.first_name ?? ''}
        lastName={profile?.last_name ?? ''}
        phone={profile?.phone ?? ''}
        homeCity={profile?.home_city ?? ''}
        role={profile?.role ?? 'sender'}
        idStatus={carrierProfile?.id_verification_status ?? 'unverified'}
      />
    </AppShell>
  );
}
