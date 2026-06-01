'use client';

import { useState } from 'react';

interface OperatorPickerProps {
  fromStation: string;
  toStation: string;
  departureDate: string;
  onSelectOperator: (operator: string) => void;
  disabled?: boolean;
}

// Common UK train operators for testing
const COMMON_OPERATORS = [
  'LNER',
  'TransPennine Express',
  'Avanti West Coast',
  'East Midlands Railway',
  'Great Western Railway',
  'Northern',
  'South Western Railway',
  'Southeastern',
];

export default function OperatorPicker({
  fromStation,
  toStation,
  departureDate,
  onSelectOperator,
  disabled,
}: OperatorPickerProps) {
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [customOperator, setCustomOperator] = useState('');

  function handleSelect(operator: string) {
    setSelectedOperator(operator);
    setCustomOperator('');
    onSelectOperator(operator);
  }

  function handleCustomOperator() {
    if (customOperator.trim()) {
      setSelectedOperator(customOperator);
      onSelectOperator(customOperator);
    }
  }

  if (!fromStation || !toStation || fromStation === toStation || !departureDate) {
    return (
      <div className="text-sm text-ink-soft italic p-3 bg-gray-50 rounded-lg">
        Select date and both stations to continue.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {COMMON_OPERATORS.map((operator) => (
          <button
            key={operator}
            type="button"
            onClick={() => handleSelect(operator)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition text-left ${
              selectedOperator === operator
                ? 'border-accent-mid bg-accent-light'
                : 'border-rail hover:border-accent-mid bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-medium text-sm">{operator}</span>
            {selectedOperator === operator && (
              <span className="text-accent-mid font-medium">✓</span>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-rail pt-3">
        <label className="text-xs text-ink-muted uppercase tracking-wider font-medium mb-2 block">
          Or enter a custom operator
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customOperator}
            onChange={(e) => setCustomOperator(e.target.value)}
            placeholder="e.g., ScotRail, TfL"
            className="flex-1 border border-rail rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-mid"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleCustomOperator}
            disabled={!customOperator.trim() || disabled}
            className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink transition disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
