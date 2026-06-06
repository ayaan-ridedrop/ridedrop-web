'use client';

/**
 * Trust tier badge - shows user reputation
 * Tiers: basic (new), verified (1+ deliveries), trusted (5+ + 4.5+ rating)
 */

export function TrustBadge({ tier, deliveries, rating }: { tier: 'basic' | 'verified' | 'trusted'; deliveries?: number; rating?: number }) {
  const styles = {
    basic: 'bg-gray-100 text-gray-700 border-gray-300',
    verified: 'bg-blue-100 text-blue-700 border-blue-300',
    trusted: 'bg-green-100 text-green-700 border-green-300',
  };

  const icons = {
    basic: '●',
    verified: '✓',
    trusted: '★',
  };

  const labels = {
    basic: 'Basic',
    verified: 'Verified',
    trusted: 'Trusted',
  };

  const tooltips = {
    basic: 'New user',
    verified: 'ID verified',
    trusted: '5+ deliveries, 4.5+ rating',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[tier]}`}
      title={tooltips[tier]}
    >
      <span className="text-sm">{icons[tier]}</span>
      <span>{labels[tier]}</span>
      {rating && deliveries && (
        <span className="text-xs opacity-75">
          ({deliveries}★ {rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}

/**
 * Trust tier badge for profiles - larger version
 */
export function TrustBadgeLarge({ tier, deliveries, rating }: { tier: 'basic' | 'verified' | 'trusted'; deliveries?: number; rating?: number }) {
  const styles = {
    basic: 'bg-gray-50 border-gray-300 text-gray-700',
    verified: 'bg-blue-50 border-blue-300 text-blue-700',
    trusted: 'bg-green-50 border-green-300 text-green-700',
  };

  const icons = {
    basic: '●',
    verified: '✓',
    trusted: '★',
  };

  const labels = {
    basic: 'Basic',
    verified: 'Verified',
    trusted: 'Trusted',
  };

  const descriptions = {
    basic: 'New user',
    verified: 'ID verified',
    trusted: 'Expert carrier',
  };

  return (
    <div className={`border rounded-xl p-4 ${styles[tier]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icons[tier]}</span>
        <div>
          <div className="font-bold">{labels[tier]}</div>
          <div className="text-sm opacity-75">{descriptions[tier]}</div>
        </div>
      </div>
      {deliveries !== undefined && rating !== undefined && (
        <div className="flex gap-3 text-sm mt-2 pt-2 border-t border-current border-opacity-20">
          <div>
            <div className="opacity-75">Deliveries</div>
            <div className="font-semibold">{deliveries}</div>
          </div>
          <div>
            <div className="opacity-75">Rating</div>
            <div className="font-semibold">{rating.toFixed(1)} / 5</div>
          </div>
        </div>
      )}
    </div>
  );
}
