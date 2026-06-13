'use client';

// Live train tracking for a booking in transit. Polls /api/track and shows the
// carrying train's position stop-by-stop (just-left / next-stop / ETA). Works on
// the time-based mock today; goes truly live the moment a TRAIN_API_TOKEN is set
// server-side (see src/lib/darwin-api.ts) — no change needed here.

import { useEffect, useState } from 'react';

type StopState = 'done' | 'current' | 'todo';
interface JourneyStop { name: string; scheduled: string; state: StopState }
interface JourneyProgress {
  service: string;
  stops: JourneyStop[];
  currentIndex: number;
  etaText: string;
  onTime: boolean;
  phase: 'before' | 'in_transit' | 'arrived';
  justLeft: string | null;
  nextStop: string | null;
  isLive: boolean;
}

export default function LiveTrainTracking({
  from,
  to,
  departureAt,
  arrivalAt,
  operator,
  carrierName,
}: {
  from: string;
  to: string;
  departureAt: string;
  arrivalAt?: string | null;
  operator?: string | null;
  carrierName?: string | null;
}) {
  const [p, setP] = useState<JourneyProgress | null>(null);

  useEffect(() => {
    let active = true;
    const q = new URLSearchParams({ from, to, departureAt });
    if (arrivalAt) q.set('arrivalAt', arrivalAt);
    if (operator) q.set('operator', operator);

    async function load() {
      try {
        const res = await fetch(`/api/track?${q.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as JourneyProgress;
        if (active) setP(data);
      } catch {
        /* keep last good state */
      }
    }
    load();
    const t = setInterval(load, 45_000); // refresh every 45s
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [from, to, departureAt, arrivalAt, operator]);

  if (!p) return null;

  const headline =
    p.phase === 'before'
      ? `Departs ${from} at ${p.stops[0]?.scheduled}`
      : p.phase === 'arrived'
        ? `Arrived · ${to}`
        : `In transit · just left ${p.justLeft ?? from}`;

  const sub =
    p.phase === 'arrived'
      ? 'Carrier will confirm delivery with the recipient PIN.'
      : `On board with ${carrierName ?? 'your carrier'}${p.onTime ? ' · running on time' : ''}.`;

  return (
    <div className="bg-white border border-rail rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-display font-bold text-lg">
            {from} → {to}
          </h3>
          <p className="text-sm text-ink-muted">{p.service}</p>
        </div>
        <span className="inline-flex items-center gap-2 bg-accent-light text-accent text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-mid animate-pulse" />
          {p.isLive ? 'Live' : 'Live (demo)'}
        </span>
      </div>

      <div className="bg-accent-light rounded-xl px-4 py-3 my-5">
        <p className="text-sm font-semibold text-accent">🚆 {headline}</p>
        <p className="text-[13px] text-accent/80 mt-0.5">{sub}</p>
      </div>

      <ol className="relative">
        {p.stops.map((s, i) => {
          const last = i === p.stops.length - 1;
          return (
            <li key={s.name} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  className={`absolute left-[8px] top-4 bottom-0 w-0.5 ${
                    i < p.currentIndex ? 'bg-accent-mid' : 'bg-rail'
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 w-[18px] h-[18px] rounded-full border-4 shrink-0 ${
                  s.state === 'done'
                    ? 'border-accent-mid bg-accent-mid'
                    : s.state === 'current'
                      ? 'border-ink bg-white'
                      : 'border-rail-dark bg-white'
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-[15px] leading-tight ${
                    s.state === 'todo' ? 'text-ink-muted font-medium' : 'font-semibold'
                  }`}
                >
                  {s.name}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {s.state === 'done'
                    ? 'Departed'
                    : s.state === 'current'
                      ? p.phase === 'before'
                        ? 'Departs'
                        : 'Next stop'
                      : 'Scheduled'}{' '}
                  <span className={s.state === 'current' ? 'text-accent font-semibold' : ''}>
                    {s.scheduled}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-rail">
        <div className="text-sm text-ink-soft">
          {carrierName ? `${carrierName} is carrying your parcel` : 'Your parcel is on board'}
        </div>
        <div className="ml-auto text-right">
          <div className="font-display font-extrabold text-lg leading-none">{p.etaText}</div>
          <div className={`text-xs font-semibold ${p.onTime ? 'text-accent-mid' : 'text-red-600'}`}>
            {p.onTime ? 'on time' : 'delayed'}
          </div>
        </div>
      </div>
    </div>
  );
}
