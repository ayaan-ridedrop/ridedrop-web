// /send — sender posts a delivery job.
// Minimal single-page form for the MVP. Multi-step UX can come later.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import SendJobForm from './SendJobForm';

export default async function SendPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <h1 className="text-4xl mb-2">Post a delivery</h1>
      <p className="text-ink-soft mb-10 font-light max-w-lg">
        Tell us what's going where and what you'll pay. Carriers on your route
        see it immediately.
      </p>
      <SendJobForm />
    </AppShell>
  );
}
