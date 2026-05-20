'use client';

import { useState, useRef } from 'react';

interface TicketPhotoUploadProps {
  onPhotoCapture: (photoData: string) => void;
  disabled?: boolean;
}

export default function TicketPhotoUpload({
  onPhotoCapture,
  disabled,
}: TicketPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setFileName(file.name);
      onPhotoCapture(base64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="w-full border-2 border-dashed border-rail rounded-xl px-4 py-6 text-center hover:border-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="text-sm font-medium text-ink">Choose ticket photo</div>
        <div className="text-xs text-ink-soft mt-1">or drag and drop</div>
      </button>
      {fileName && (
        <div className="text-xs text-green-600">
          File selected: {fileName}
        </div>
      )}
    </div>
  );
}
