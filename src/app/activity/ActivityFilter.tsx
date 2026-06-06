'use client';

import { useState } from 'react';
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/activity?${params.toString()}`);
  };

  return (
    <div className="mb-8 space-y-4">
      {/* BASIC FILTERS */}
      <div className="space-y-4">
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
        <div className="flex items-end gap-4">
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
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-accent underline font-medium hover:text-ink transition"
          >
            {showAdvanced ? '▼ Hide' : '▶ Show'} advanced filters
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERS */}
      {showAdvanced && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">Route search</label>
            <input
              type="text"
              placeholder="e.g., London → Manchester"
              onChange={(e) => updateFilter('route', e.target.value)}
              className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink-muted mb-2 block">Min price (£)</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => updateFilter('priceMin', e.target.value)}
                className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted mb-2 block">Max price (£)</label>
              <input
                type="number"
                placeholder="999"
                onChange={(e) => updateFilter('priceMax', e.target.value)}
                className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">Carrier trust tier</label>
            <select
              onChange={(e) => updateFilter('trustTier', e.target.value)}
              className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
            >
              <option value="">All tiers</option>
              <option value="trusted">⭐ Trusted only</option>
              <option value="verified">✓ Verified+</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">Min rating</label>
            <select
              onChange={(e) => updateFilter('minRating', e.target.value)}
              className="w-full border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition"
            >
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
            </select>
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams();
              router.push('/activity');
            }}
            className="w-full text-sm text-red-600 hover:text-red-700 font-medium underline transition"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
