/**
 * National Rail Darwin API integration
 * Fetches real UK train times and schedules
 *
 * Docs: https://www.nationalrail.co.uk/
 * API: Requires registration for a token
 */

// For MVP: Return mock data structure
// In production, swap this for real Darwin API calls

export interface TrainService {
  id: string;
  departure: string; // HH:MM
  arrival: string; // HH:MM
  platform: string | null;
  operator: string;
  duration: string; // "1h 30m"
  changes: number; // 0, 1, 2+
  isFast: boolean; // direct service
}

export interface TrainSchedule {
  fromStation: string;
  toStation: string;
  date: string; // YYYY-MM-DD
  services: TrainService[];
}

/**
 * Get train schedule between two stations
 *
 * TODO: Replace mock data with real Darwin API calls once token is obtained
 */
export async function getTrainSchedule(
  from: string,
  to: string,
  departDate: string // YYYY-MM-DD
): Promise<TrainSchedule> {
  // Mock data for demo
  // Structure matches real train times between major UK cities

  const mockSchedules: Record<string, TrainService[]> = {
    'London Euston-Manchester Piccadilly': [
      {
        id: 'em101',
        departure: '06:15',
        arrival: '08:35',
        platform: '5',
        operator: 'Avanti West Coast',
        duration: '2h 20m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em102',
        departure: '07:00',
        arrival: '09:15',
        platform: '7',
        operator: 'Avanti West Coast',
        duration: '2h 15m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em103',
        departure: '08:00',
        arrival: '10:20',
        platform: '8',
        operator: 'Avanti West Coast',
        duration: '2h 20m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em104',
        departure: '09:00',
        arrival: '11:15',
        platform: '6',
        operator: 'Avanti West Coast',
        duration: '2h 15m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em105',
        departure: '10:00',
        arrival: '12:45',
        platform: null,
        operator: 'TransPennine Express',
        duration: '2h 45m',
        changes: 0,
        isFast: false,
      },
      {
        id: 'em106',
        departure: '11:00',
        arrival: '13:30',
        platform: '9',
        operator: 'Avanti West Coast',
        duration: '2h 30m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em107',
        departure: '12:00',
        arrival: '14:20',
        platform: '4',
        operator: 'Avanti West Coast',
        duration: '2h 20m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em108',
        departure: '13:00',
        arrival: '15:30',
        platform: '3',
        operator: 'Avanti West Coast',
        duration: '2h 30m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em109',
        departure: '14:00',
        arrival: '16:25',
        platform: '5',
        operator: 'Avanti West Coast',
        duration: '2h 25m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'em110',
        departure: '15:00',
        arrival: '17:30',
        platform: '1',
        operator: 'TransPennine Express',
        duration: '2h 30m',
        changes: 0,
        isFast: false,
      },
    ],
    'London King\'s Cross-Edinburgh Waverley': [
      {
        id: 'se101',
        departure: '05:30',
        arrival: '10:05',
        platform: '2',
        operator: 'LNER',
        duration: '4h 35m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'se102',
        departure: '07:00',
        arrival: '11:25',
        platform: '4',
        operator: 'LNER',
        duration: '4h 25m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'se103',
        departure: '09:00',
        arrival: '13:30',
        platform: '8',
        operator: 'LNER',
        duration: '4h 30m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'se104',
        departure: '11:00',
        arrival: '15:45',
        platform: '3',
        operator: 'LNER',
        duration: '4h 45m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'se105',
        departure: '13:00',
        arrival: '17:45',
        platform: '6',
        operator: 'LNER',
        duration: '4h 45m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'se106',
        departure: '14:00',
        arrival: '19:00',
        platform: null,
        operator: 'Transpennine Express',
        duration: '5h 00m',
        changes: 0,
        isFast: false,
      },
    ],
    'London King\'s Cross-Doncaster': [
      {
        id: 'kd101',
        departure: '06:30',
        arrival: '09:15',
        platform: '5',
        operator: 'LNER',
        duration: '2h 45m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'kd102',
        departure: '08:00',
        arrival: '10:45',
        platform: '3',
        operator: 'LNER',
        duration: '2h 45m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'kd103',
        departure: '10:00',
        arrival: '12:50',
        platform: '7',
        operator: 'LNER',
        duration: '2h 50m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'kd104',
        departure: '12:00',
        arrival: '14:50',
        platform: '2',
        operator: 'LNER',
        duration: '2h 50m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'kd105',
        departure: '14:00',
        arrival: '16:45',
        platform: '4',
        operator: 'LNER',
        duration: '2h 45m',
        changes: 0,
        isFast: true,
      },
      {
        id: 'kd106',
        departure: '16:00',
        arrival: '18:50',
        platform: '6',
        operator: 'LNER',
        duration: '2h 50m',
        changes: 0,
        isFast: true,
      },
    ],
  };

  // Look up schedule for this route
  const key = `${from}-${to}`;
  const services = mockSchedules[key] || [];

  return {
    fromStation: from,
    toStation: to,
    date: departDate,
    services,
  };
}

/**
 * TODO: When Darwin API token is obtained, implement this:
 *
 * export async function getTrainScheduleReal(
 *   from: string,
 *   to: string,
 *   departDate: string
 * ): Promise<TrainSchedule> {
 *   const token = process.env.DARWIN_API_TOKEN;
 *   if (!token) throw new Error('Darwin API token not configured');
 *
 *   const response = await fetch(`https://api.realtime.nationalrail.co.uk/...`, {
 *     headers: {
 *       'X-API-Key': token,
 *     },
 *   });
 *
 *   if (!response.ok) throw new Error('Failed to fetch train schedule');
 *   return response.json();
 * }
 */

// ════════════════════════════════════════════════════════════════════
// LIVE JOURNEY PROGRESS — powers the live train-tracking on a booking.
// ════════════════════════════════════════════════════════════════════
// Right now this is a TIME-BASED MOCK: it interpolates the train's position
// from the journey's scheduled departure/arrival vs the current time, so the
// tracker "moves" realistically without an API. When you add a real train API
// (Realtime Trains api.rtt.io is the quickest — set TRAIN_API_TOKEN), replace
// the body of getLiveJourneyProgress() with a call to it; the shape below is
// what the UI expects, so nothing else has to change.

export type StopState = 'done' | 'current' | 'todo';

export interface JourneyStop {
  name: string;
  scheduled: string; // HH:MM (Europe/London)
  state: StopState;
}

export interface JourneyProgress {
  service: string; // e.g. "09:14 Avanti West Coast"
  stops: JourneyStop[];
  currentIndex: number; // index of the current / next stop
  etaText: string; // arrival HH:MM
  onTime: boolean;
  phase: 'before' | 'in_transit' | 'arrived';
  justLeft: string | null; // last stop departed
  nextStop: string | null;
  isLive: boolean; // false until a real train API token is configured
}

// Intermediate calling points for known routes. Unknown routes just show
// origin → destination (still works, fewer stops).
const ROUTE_STOPS: Record<string, string[]> = {
  'London Euston|Manchester Piccadilly': ['Milton Keynes Central', 'Rugby', 'Stoke-on-Trent', 'Stockport'],
  'Manchester Piccadilly|London Euston': ['Stockport', 'Stoke-on-Trent', 'Rugby', 'Milton Keynes Central'],
  'London Euston|Birmingham New Street': ['Watford Junction', 'Milton Keynes Central', 'Coventry'],
  'London Kings Cross|Edinburgh Waverley': ['York', 'Darlington', 'Newcastle', 'Berwick-upon-Tweed'],
  'London Kings Cross|Leeds': ['Stevenage', 'Peterborough', 'Doncaster', 'Wakefield Westgate'],
};

function hhmm(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

export function getLiveJourneyProgress(opts: {
  from: string;
  to: string;
  departureAt: string; // ISO
  arrivalAt?: string | null; // ISO
  operator?: string | null;
  now?: Date;
}): JourneyProgress {
  const now = opts.now ?? new Date();
  const dep = new Date(opts.departureAt);
  const arr = opts.arrivalAt ? new Date(opts.arrivalAt) : new Date(dep.getTime() + 2 * 60 * 60 * 1000);

  const mids = ROUTE_STOPS[`${opts.from}|${opts.to}`] ?? [];
  const names = [opts.from, ...mids, opts.to];
  const total = names.length;
  const spanMs = Math.max(arr.getTime() - dep.getTime(), 1);

  // Scheduled time at each stop = linear interpolation dep → arr.
  const stopTimes = names.map((_, i) => new Date(dep.getTime() + (spanMs * i) / (total - 1)));

  // Where is the train now?
  let currentIndex: number;
  let phase: JourneyProgress['phase'];
  if (now.getTime() <= dep.getTime()) {
    currentIndex = 0;
    phase = 'before';
  } else if (now.getTime() >= arr.getTime()) {
    currentIndex = total - 1;
    phase = 'arrived';
  } else {
    const frac = (now.getTime() - dep.getTime()) / spanMs;
    currentIndex = Math.min(total - 1, Math.max(1, Math.round(frac * (total - 1))));
    phase = 'in_transit';
  }

  const stops: JourneyStop[] = names.map((name, i) => ({
    name,
    scheduled: hhmm(stopTimes[i]),
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo',
  }));

  const service = `${hhmm(dep)} ${opts.operator ?? 'service'}`.trim();

  return {
    service,
    stops,
    currentIndex,
    etaText: hhmm(arr),
    onTime: true, // a real API would report actual vs scheduled here
    phase,
    justLeft: currentIndex > 0 ? names[currentIndex - 1] : null,
    nextStop: currentIndex < total ? names[currentIndex] : null,
    isLive: !!process.env.TRAIN_API_TOKEN,
  };
}
