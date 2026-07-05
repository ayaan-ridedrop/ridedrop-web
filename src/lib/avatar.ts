// Avatars live in a PRIVATE Supabase Storage bucket. They are readable only
// by the owner and by a counterparty who shares an accepted-or-later booking
// (enforced by storage RLS). To display one, we mint a short-lived signed URL
// scoped to the current viewer. If the viewer isn't allowed to see it (RLS
// denies) or there's no avatar, this returns null and the caller shows initials.
export async function signAvatar(
  supabase: any,
  avatarPath?: string | null,
): Promise<string | null> {
  if (!avatarPath) return null;
  // Stored value is the object path within the bucket. Strip a legacy
  // 'avatars/' bucket prefix if an older row still has one.
  const path = avatarPath.replace(/^avatars\//, '');
  try {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// Sign several profiles' avatars at once, returning the same objects with
// avatar_url replaced by a signed URL (or null). Used on list views.
export async function signAvatars<T extends { avatar_url?: string | null }>(
  supabase: any,
  profiles: T[],
): Promise<T[]> {
  return Promise.all(
    profiles.map(async (p) => ({
      ...p,
      avatar_url: await signAvatar(supabase, p.avatar_url),
    })),
  );
}
