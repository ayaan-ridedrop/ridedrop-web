// ⚠️ DEPRECATED (v2) — DO NOT USE. photo-driven state changes; photos are now part of confirm_pickup/confirm_delivery RPCs.
// No longer imported anywhere. Kept for reference only.
// Server Action — receive a pickup or delivery photo for a booking.
// Photos go to the 'package-photos' bucket at: <booking_id>/<kind>.<ext>
// GPS coords are captured client-side (browser geolocation) at the moment
// of upload and stored on the booking row as a separate, harder-to-fake
// signal than relying on EXIF data alone.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const kindSchema = z.enum(['pickup', 'delivery']);

export async function uploadPackagePhoto(formData: FormData) {
  const bookingId = formData.get('bookingId');
  const kind = kindSchema.parse(formData.get('kind'));
  const file = formData.get('photo') as File | null;
  const gpsLatRaw = formData.get('gpsLat');
  const gpsLngRaw = formData.get('gpsLng');

  if (!bookingId || typeof bookingId !== 'string') return { error: 'Missing bookingId' };
  if (!file || file.size === 0) return { error: 'Missing file' };
  if (file.size > 10 * 1024 * 1024) return { error: 'File too large (max 10 MB)' };

  const supabase  = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Confirm this user is part of the booking and the booking is in a state
  // that accepts this kind of photo.
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, sender_id, carrier_id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return { error: 'Booking not found' };
  if (booking.carrier_id !== user.id && booking.sender_id !== user.id) {
    return { error: 'Not your booking' };
  }

  // Only the carrier should be taking the photos — they're with the package.
  if (booking.carrier_id !== user.id) {
    return { error: 'Only the carrier uploads handoff photos' };
  }

  if (kind === 'pickup' && !['accepted', 'picked_up', 'in_transit'].includes(booking.status)) {
    return { error: `Cannot upload pickup photo while booking is ${booking.status}` };
  }
  if (kind === 'delivery' && !['picked_up', 'in_transit', 'delivered'].includes(booking.status)) {
    return { error: `Cannot upload delivery photo while booking is ${booking.status}` };
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${booking.id}/${kind}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageErr } = await supabase
    .storage
    .from('package-photos')
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (storageErr) {
    return { error: `Upload failed: ${storageErr.message}` };
  }

  // Build a signed URL (1 hour) — these photos are private.
  const { data: signed } = await supabase
    .storage
    .from('package-photos')
    .createSignedUrl(path, 60 * 60);

  const now = new Date().toISOString();
  const gpsLat = gpsLatRaw ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw ? Number(gpsLngRaw) : null;

  const update: Record<string, any> = {};
  if (kind === 'pickup') {
    update.pickup_photo_url = path;
    update.pickup_photo_at = now;
    if (gpsLat) update.pickup_gps_lat = gpsLat;
    if (gpsLng) update.pickup_gps_lng = gpsLng;
    // Advance status if we're still at 'accepted'.
    if (booking.status === 'accepted') update.status = 'picked_up';
  } else {
    update.delivery_photo_url = path;
    update.delivery_photo_at = now;
    if (gpsLat) update.delivery_gps_lat = gpsLat;
    if (gpsLng) update.delivery_gps_lng = gpsLng;
    if (['picked_up', 'in_transit'].includes(booking.status)) {
      update.status = 'delivered';
      // Auto-release the funds 24h from delivery, unless sender confirms sooner.
      update.auto_release_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const { error: updateErr } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', booking.id);

  if (updateErr) return { error: updateErr.message };

  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true, signedUrl: signed?.signedUrl };
}
