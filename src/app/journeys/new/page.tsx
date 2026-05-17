// /journeys/new — carrier lists an upcoming train journey.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import NewJourneyForm from './NewJourneyForm';

export default async function NewJourneyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .maybeSingle();

  // Friendly nudge — sender-only accounts get pushed to add carrier mode first.
  const isCarrier = profile?.role === 'carrier' || profile?.role === 'both';

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">List a journey</h1>
      <p className="text-ink-soft mb-10 font-light max-w-lg">
        Tell us about a train trip you're already taking. Senders on your route
        will be able to book you.
      </p>
      {!isCarrier ? (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 max-w-xl">
          <p className="text-amber-900 text-sm">
            Your account is sender-only. To list a journey you need to switch
            on carrier mode in <a href="/profile" className="underline font-medium">your profile</a>.
            Carriers also need to complete ID verification before a journey can go live.
          </p>
        </div>
      ) : (
        <NewJourneyForm />
      )}
    </AppShell>
  );
}
