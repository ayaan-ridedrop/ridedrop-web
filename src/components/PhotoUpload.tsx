'use client';

import { useState, useRef } from 'react';
import { uploadPackagePhoto } from '@/lib/actions/upload-package-photo';

export default function PhotoUpload({
  bookingId,
  kind,
  existingUrl,
}: {
  bookingId: string;
  kind: 'pickup' | 'delivery';
  existingUrl?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takeAndUpload(file: File) {
    setUploading(true);
    setError(null);
    setPreview(URL.createObjectURL(file));

    // Try to capture GPS at the moment of upload (more trustworthy than EXIF).
    let gps: { lat: number; lng: number } | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
      );
      gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // GPS denied or unavailable. Photo still uploads, no coords stored.
    }

    const fd = new FormData();
    fd.append('bookingId', bookingId);
    fd.append('kind', kind);
    fd.append('photo', file);
    if (gps) {
      fd.append('gpsLat', String(gps.lat));
      fd.append('gpsLng', String(gps.lng));
    }

    const res = await uploadPackagePhoto(fd);
    setUploading(false);
    if (res && 'error' in res) {
      setError(res.error ?? null);
      setPreview(existingUrl ?? null);
      return;
    }
  }

  if (preview) {
    return (
      <div className="bg-white border border-rail rounded-2xl p-4">
        <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
          {kind} photo
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt={`${kind} photo`}
          className="rounded-xl w-full max-h-72 object-cover"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 text-sm text-accent underline"
        >
          Replace photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) takeAndUpload(f);
          }}
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-dashed border-rail-dark rounded-2xl p-6 text-center">
      <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
        {kind} photo required
      </div>
      <p className="text-sm text-ink-soft mb-4 font-light">
        {kind === 'pickup'
          ? 'Photograph the package as you collect it from the sender.'
          : 'Photograph the package once handed over at the destination.'}
      </p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="bg-ink text-white rounded-full px-5 py-3 text-sm font-medium hover:bg-accent transition disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : `Take ${kind} photo`}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) takeAndUpload(f);
        }}
      />
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
