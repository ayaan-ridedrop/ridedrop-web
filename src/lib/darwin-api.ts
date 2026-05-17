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
