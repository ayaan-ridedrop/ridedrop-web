'use server';

import { createClient } from '@/lib/supabase/server';

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Upload to storage
  const fileName = `${user.id}-${Date.now()}`;
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` };

  // Update profile with avatar URL
  const avatarPath = `avatars/${fileName}`;
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarPath })
    .eq('id', user.id);

  if (updateErr) return { error: `Update failed: ${updateErr.message}` };

  return { ok: true, avatarUrl: avatarPath };
}
