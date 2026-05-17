'use client';

// Tiny interactive calculator: "if you carried N times a week at £X, you'd
// take home £Y after commission". Doesn't fetch anything — pure UI eye-candy
// that nudges potential carriers to sign up.

import { useState } from 'react';
import { RIDEDROP_COMMISSION } from '@/lib/types';

export default function EarningsCalculator() {
  const [trips, setTrips] = useState(3);
  const [price, setPrice] = useState(24);

  const gross = trips * price;
  const commission = Math.round(gross * RIDEDROP_COMMISSION);
  const net = gross - commission;
  const monthly = net * 4;

  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 max-w-md shadow-xl">
      <h3 className="font-display font-bold text-lg mb-1">What could you earn?</h3>
      <p className="text-sm text-ink-muted font-light mb-6">
        Slide to see your weekly take-home.
      </p>

      <Slider
        label="Trips per week"
        value={trips}
        min={1}
        max={7}
        step={1}
        suffix={` trip${trips === 1 ? '' : 's'}`}
        onChange={setTrips}
      />
      <Slider
        label="Avg. price per delivery"
        value={price}
        min={15}
        max={45}
        step={1}
        prefix="£"
        onChange={setPrice}
      />

      <div className="border-t border-rail mt-6 pt-5 space-y-2">
        <Row label="Gross">£{gross.toFixed(0)}</Row>
        <Row label={`RideDrop commission (${(RIDEDROP_COMMISSION * 100).toFixed(0)}%)`} muted>
          −£{commission.toFixed(0)}
        </Row>
        <div className="flex justify-between items-end pt-3 border-t border-rail">
          <span className="text-sm font-medium">Your weekly earnings</span>
          <span className="font-display font-extrabold text-3xl text-accent">
            £{net.toFixed(0)}
          </span>
        </div>
        <p className="text-xs text-ink-muted text-right">
          ≈ £{monthly.toFixed(0)}/month at this rate
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="font-display font-bold text-base">
          {prefix}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

function Row({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${muted ? 'text-ink-muted' : ''}`}>
      <span>{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
