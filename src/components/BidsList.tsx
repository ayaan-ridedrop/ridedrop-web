'use client';

import { useState } from 'react';
import { acceptBid } from '@/lib/actions/accept-bid';
import { TrustBadge } from './TrustBadge';
import { LoadingSpinner } from './LoadingSpinner';

export default function BidsList({
  jobId,
  bids,
  carriers,
  journeys,
  trustTiers = {},
}: {
  jobId: string;
  bids: Array<{ id: string; carrier_id: string; journey_id: string; amount_pence: number; status: string }>;
  carriers: Record<string, { first_name: string; last_name: string; avatar_url?: string }>;
  journeys: Record<string, { from_station: string; to_station: string; departure_at: string; arrival_at: string }>;
  trustTiers?: Record<string, { tier: 'basic' | 'verified' | 'trusted'; deliveries: number; rating: number }>;
}) {
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(bidId: string) {
    setError(null);
    setAccepting(bidId);

    const fd = new FormData();
    fd.append('bidId', bidId);

    const res = await acceptBid(fd);
    setAccepting(null);

    if (res && 'error' in res) {
      setError(res.error ?? 'Something went wrong');
    } else {
      alert('Bid accepted! Booking created.');
      // Page will revalidate, showing new booking
    }
  }

  const pendingBids = bids.filter((b) => b.status === 'pending');

  if (pendingBids.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3 text-sm text-amber-900">
        No bids yet. Share this job with carriers!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-lg">Bids from carriers ({pendingBids.length})</h3>

      {pendingBids.map((bid) => {
        const carrier = carriers[bid.carrier_id];
        const journey = journeys[bid.journey_id];
        if (!carrier || !journey) return null;

        const departureTime = new Date(journey.departure_at);
        const arrivalTime = new Date(journey.arrival_at);

        return (
          <div key={bid.id} className="bg-white border border-rail rounded-2xl p-4">
            {/* Carrier + trust tier row */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                {/* Carrier photos stay private until the sender accepts a bid,
                    so during bidding we show initials only, never the photo. */}
                <div className="w-12 h-12 rounded-full bg-rail flex items-center justify-center text-ink-muted font-bold">
                  {carrier.first_name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {carrier.first_name} {carrier.last_name}
                  </div>
                </div>
              </div>
              {trustTiers[bid.carrier_id] ? (
                <TrustBadge
                  tier={trustTiers[bid.carrier_id].tier}
                  deliveries={trustTiers[bid.carrier_id].deliveries}
                  rating={trustTiers[bid.carrier_id].rating}
                />
              ) : null}
            </div>

            {/* Journey details */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-sm space-y-1">
              <div className="font-medium text-blue-900">
                {journey.from_station} → {journey.to_station}
              </div>
              <div className="text-xs text-blue-800">
                Departs: {departureTime.toLocaleString('en-GB')}
              </div>
              <div className="text-xs text-blue-800">
                Arrives: {arrivalTime.toLocaleString('en-GB')}
              </div>
            </div>

            {/* Bid price */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-ink-muted">Bid price:</span>
              <span className="font-display font-bold text-lg text-accent">
                £{(bid.amount_pence / 100).toFixed(2)}
              </span>
            </div>

            {/* Message & Accept buttons */}
            <div className="flex gap-2">
              <a
                href={`/messages?user=${bid.carrier_id}`}
                className="flex-1 border border-accent text-accent rounded-full px-4 py-2 text-sm font-medium hover:bg-accent/10 transition text-center"
              >
                💬 Message
              </a>
              <button
                onClick={() => handleAccept(bid.id)}
                disabled={accepting === bid.id}
                className="flex-1 bg-accent text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-ink transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {accepting === bid.id ? (
                  <>
                    <LoadingSpinner size="sm" inline />
                    Accepting...
                  </>
                ) : (
                  'Accept'
                )}
              </button>
            </div>
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
    </div>
  );
}
