'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function ActivityFilter({
  currentType,
  currentStatus,
  currentSort,
}: {
  currentType: string;
  currentStatus: string;
  currentSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/activity?${params.toString()}`);
  };

  return (
    <div className="mb-8 space-y-4">
      {/* TYPE FILTER */}
      <div>
        <label className="text-sm font-medium text-ink-muted mb-2 block">Type</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'booking', label: '📦 Bookings' },
            { value: 'job', label: '📋 Jobs' },
            { value: 'journey', label: '🚂 Journeys' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('type', opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentType === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-rail text-ink hover:bg-rail-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* STATUS FILTER */}
      <div>
        <label className="text-sm font-medium text-ink-muted mb-2 block">Status</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'matched', label: 'Matched' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('status', opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentStatus === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-rail text-ink hover:bg-rail-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* SORT */}
      <div>
        <label className="text-sm font-medium text-ink-muted mb-2 block">Sort</label>
        <select
          value={currentSort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
