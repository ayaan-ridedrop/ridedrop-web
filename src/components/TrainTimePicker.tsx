'use client';

import { useState, useEffect } from 'react';
import { getTrainSchedule, TrainService } from '@/lib/darwin-api';

interface TrainTimePickerProps {
  fromStation: string;
  toStation: string;
  onSelectTime: (departure: string, arrival: string, duration: string) => void;
  disabled?: boolean;
}

export default function TrainTimePicker({
  fromStation,
  toStation,
  onSelectTime,
  disabled,
}: TrainTimePickerProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<TrainService[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load train schedule when stations change
  useEffect(() => {
    if (!fromStation || !toStation || fromStation === toStation) {
      setServices([]);
      setSelectedId(null);
      return;
    }

    async function fetchSchedule() {
      setLoading(true);
      setError(null);
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const schedule = await getTrainSchedule(fromStation, toStation, dateStr);
        setServices(schedule.services);

        if (schedule.services.length === 0) {
          setError('No trains found for this route. Please check the stations.');
        }
      } catch (err) {
        setError('Could not load train schedule. Please try again.');
        console.error('[train picker]', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();
  }, [fromStation, toStation]);

  function handleSelect(service: TrainService) {
    setSelectedId(service.id);
    onSelectTime(service.departure, service.arrival, service.duration);
  }

  if (!fromStation || !toStation || fromStation === toStation) {
    return (
      <div className="text-sm text-ink-soft italic p-3 bg-gray-50 rounded-lg">
        Select both stations to see available trains.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft p-3">
        <span className="animate-spin">⏳</span>
        Loading trains...
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

  if (services.length === 0) {
    return (
      <div className="text-sm text-ink-soft italic p-3 bg-gray-50 rounded-lg">
        No trains available for this route.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-muted">
        Departing tomorrow — select a train:
      </p>
      <div className="grid gap-2">
        {services.slice(0, 8).map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelect(service)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition text-left ${
              selectedId === service.id
                ? 'border-accent-mid bg-accent-light'
                : 'border-rail hover:border-accent-mid bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex-1">
              <div className="font-medium text-sm">
                {service.departure} → {service.arrival}
              </div>
              <div className="text-xs text-ink-soft">
                {service.duration} • {service.operator}
                {service.isFast && ' • Direct'}
                {service.changes > 0 && ` • ${service.changes} change${service.changes > 1 ? 's' : ''}`}
              </div>
            </div>
            {selectedId === service.id && (
              <div className="ml-2 text-accent-mid font-medium">✓</div>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        Showing {Math.min(8, services.length)} of {services.length} available trains tomorrow.
      </p>
    </div>
  );
}
