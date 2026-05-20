'use client';

import { useState, useEffect } from 'react';
import { getTrainSchedule } from '@/lib/darwin-api';

interface OperatorPickerProps {
  fromStation: string;
  toStation: string;
  departureDate: string; // YYYY-MM-DD format
  onSelectOperator: (operator: string) => void;
  disabled?: boolean;
}

export default function OperatorPicker({
  fromStation,
  toStation,
  departureDate,
  onSelectOperator,
  disabled,
}: OperatorPickerProps) {
  const [loading, setLoading] = useState(false);
  const [operators, setOperators] = useState<string[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load operators when stations or date change
  useEffect(() => {
    if (!fromStation || !toStation || fromStation === toStation || !departureDate) {
      setOperators([]);
      setSelectedOperator(null);
      return;
    }

    async function fetchOperators() {
      setLoading(true);
      setError(null);
      try {
        const schedule = await getTrainSchedule(fromStation, toStation, departureDate);

        // Get unique operators and sort them
        const uniqueOperators = Array.from(
          new Set(schedule.services.map(s => s.operator))
        ).sort();

        setOperators(uniqueOperators);

        if (uniqueOperators.length === 0) {
          setError('No train operators found for this route. Please check the stations.');
        }
      } catch (err) {
        setError('Could not load train operators. Please try again.');
        console.error('[operator picker]', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOperators();
  }, [fromStation, toStation, departureDate]);

  function handleSelect(operator: string) {
    setSelectedOperator(operator);
    onSelectOperator(operator);
  }

  if (!fromStation || !toStation || fromStation === toStation || !departureDate) {
    return (
      <div className="text-sm text-ink-soft italic p-3 bg-gray-50 rounded-lg">
        Select date and both stations to see available operators.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft p-3">
        <span className="animate-spin">⌛</span>
        Loading operators...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  if (operators.length === 0) {
    return (
      <div className="text-sm text-ink-soft italic p-3 bg-gray-50 rounded-lg">
        No operators available for this route.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {operators.map((operator) => (
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
              <span className="text-accent-mid font-medium">Selected</span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        {operators.length} operator{operators.length === 1 ? '' : 's'} available
      </p>
    </div>
  );
}
