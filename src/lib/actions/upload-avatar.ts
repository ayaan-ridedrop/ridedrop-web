'use server';

import { createClient } from '@/lib/supabase/server';

// Accept only real raster images. SVG is deliberately excluded — an SVG can
// carry <script> and, if served from a trusted supabase.co URL, becomes a
// stored-XSS vector.
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic-byte sniff — never trust the client-supplied MIME type alone.
function sniffType(b: Uint8Array): keyof typeof ALLOWED | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file provided' };

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  if (file.size === 0) return { error: 'Empty file' };
  if (file.size > MAX_BYTES) return { error: 'Image must be 5 MB or smaller' };

  // Verify the real content type by magic bytes, not the client-declared type.
  const buf = new Uint8Array(await file.arrayBuffer());
  const realType = sniffType(buf);
  if (!realType) return { error: 'Only JPEG, PNG or WebP images are allowed' };
  const ext = ALLOWED[realType];

  // Owner-scoped path: avatars/<userId>/<timestamp>.<ext>. The storage RLS
  // policy keys write/read access on the first path segment (the user id).
  const fileName = `${user.id}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(fileName, buf, { upsert: true, contentType: realType });

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` };

  const avatarPath = `avatars/${fileName}`;
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarPath })
    .eq('id', user.id);

  if (updateErr) return { error: `Update failed: ${updateErr.message}` };

  return { ok: true, avatarUrl: avatarPath };
}
