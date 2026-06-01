// TypeScript shape of the database — kept in sync by hand with supabase/schema.sql.
//
// Once your dev has the Supabase CLI installed they can regenerate this
// automatically with:  supabase gen types typescript --linked > src/lib/types.ts
// Until then, treat this as the source of truth and update it when schema changes.

export type UserRole = 'sender' | 'carrier' | 'both';

export type JourneyStatus =
  | 'draft'
  | 'ticket_pending'
  | 'ticket_rejected'
  | 'listed'
  | 'full'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type JobStatus =
  | 'draft'
  | 'open'
  | 'matched'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type BookingStatus =
  | 'proposed'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type PackageSize = 'small' | 'medium' | 'large';
export type IdVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  role: UserRole;
  home_city: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarrierProfile {
  id: string;
  id_verification_status: IdVerificationStatus;
  id_verified_at: string | null;
  stripe_identity_session_id: string | null;
  stripe_connect_account_id: string | null;
  payout_enabled: boolean;
  total_deliveries: number;
  total_earnings_pence: number;
  average_rating: number | null;
  food_ok_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Journey {
  id: string;
  carrier_id: string;
  from_station: string;
  to_station: string;
  departure_at: string;
  arrival_at: string;
  train_operator: string | null;
  train_number: string | null;
  capacity: number;
  slots_remaining: number;
  minimum_price_pence: number;
  max_weight_kg: number;
  food_ok: boolean;
  ticket_url: string | null;
  ticket_verified_at: string | null;
  status: JourneyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  sender_id: string;
  from_station: string;
  to_station: string;
  pickup_address: string | null;
  delivery_address: string | null;
  must_arrive_by: string | null;
  package_description: string;
  package_category: string | null;
  package_size: PackageSize;
  package_weight_kg: number | null;
  declared_value_pence: number;
  declaration_accepted: boolean;
  max_budget_pence: number;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  job_id: string;
  journey_id: string;
  sender_id: string;
  carrier_id: string;
  agreed_price_pence: number;
  commission_pence: number;
  status: BookingStatus;
  pickup_pin: string | null;
  delivery_pin: string | null;
  pickup_photo_url: string | null;
  pickup_photo_at: string | null;
  pickup_gps_lat: number | null;
  pickup_gps_lng: number | null;
  delivery_photo_url: string | null;
  delivery_photo_at: string | null;
  delivery_gps_lat: number | null;
  delivery_gps_lng: number | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  funds_released_at: string | null;
  auto_release_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  subject_id: string;
  rating: number;
  body: string | null;
  is_auto: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  description: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'rejected';
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  role_interest: UserRole | null;
  city: string | null;
  source: string | null;
  created_at: string;
}

// Database type used by @supabase/ssr to type the client.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      carrier_profiles: { Row: CarrierProfile; Insert: Partial<CarrierProfile> & { id: string }; Update: Partial<CarrierProfile> };
      journeys: { Row: Journey; Insert: Omit<Journey, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Journey> };
      jobs: { Row: Job; Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Job> };
      bookings: { Row: Booking; Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Booking> };
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'> & { id?: string }; Update: Partial<Message> };
      reviews: { Row: Review; Insert: Omit<Review, 'id' | 'created_at'> & { id?: string }; Update: Partial<Review> };
      disputes: { Row: Dispute; Insert: Omit<Dispute, 'id' | 'created_at'> & { id?: string }; Update: Partial<Dispute> };
      waitlist: { Row: WaitlistEntry; Insert: Omit<WaitlistEntry, 'id' | 'created_at'> & { id?: string }; Update: Partial<WaitlistEntry> };
    };
  };
}

// ── UK stations (subset — keep in sync with the prototype list) ──
export const UK_STATIONS = [
  "London Euston","London King's Cross","London Paddington","London Waterloo",
  "London Victoria","London St Pancras","London Liverpool Street","London Bridge",
  "Manchester Piccadilly","Manchester Victoria","Birmingham New Street",
  "Birmingham Moor Street","Leeds","Sheffield","York","Newcastle","Edinburgh Waverley",
  "Glasgow Central","Bristol Temple Meads","Cardiff Central","Liverpool Lime Street",
  "Nottingham","Leicester","Derby","Coventry","Reading","Oxford","Cambridge",
  "Brighton","Southampton Central","Portsmouth Harbour","Exeter St Davids",
  "Plymouth","Doncaster","Huddersfield","Bradford Interchange","Wakefield Westgate",
  "Harrogate","Scarborough","Hull","Lincoln Central","Peterborough",
  "Ipswich","Norwich","Chelmsford","Luton Airport Parkway","Watford Junction",
  "Milton Keynes Central","Northampton","Rugby","Crewe","Stoke-on-Trent",
  "Chester","Wrexham General","Shrewsbury","Wolverhampton","Walsall",
  "Preston","Blackpool North","Lancaster","Penrith","Carlisle",
  "Macclesfield","Stockport","Bolton","Wigan North Western","Warrington Bank Quay",
  "Aberdeen","Dundee","Perth","Stirling","Inverness","Fort William",
] as const;

// ── Partial types for dashboard and list views ──
export interface DashboardJob extends Pick<Job, 'id' | 'from_station' | 'to_station' | 'status' | 'max_budget_pence' | 'created_at'> {}

export interface DashboardJourney extends Pick<Journey, 'id' | 'from_station' | 'to_station' | 'departure_at' | 'status'> {}

export interface DashboardBooking extends Pick<Booking, 'id' | 'status' | 'agreed_price_pence' | 'job_id' | 'journey_id'> {}

// Browse page partial types
export interface BrowseJob extends Pick<Job, 'id' | 'from_station' | 'to_station' | 'package_description' | 'package_size' | 'max_budget_pence' | 'must_arrive_by' | 'created_at'> {}

export interface BrowseJourney extends Pick<Journey, 'id' | 'from_station' | 'to_station' | 'departure_at' | 'arrival_at' | 'train_operator' | 'minimum_price_pence' | 'slots_remaining' | 'carrier_id'> {}

// Job detail page matching journeys
export interface MatchingJourney extends Pick<Journey, 'id' | 'departure_at' | 'train_operator' | 'minimum_price_pence' | 'slots_remaining'> {}

// Station coordinates (lat, lng) for distance calculations
export const STATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "London Euston": { lat: 51.5273, lng: -0.1276 },
  "London King's Cross": { lat: 51.5308, lng: -0.1119 },
  "London Paddington": { lat: 51.5156, lng: -0.1757 },
  "London Waterloo": { lat: 51.5050, lng: -0.1123 },
  "London Victoria": { lat: 51.4926, lng: -0.1441 },
  "London St Pancras": { lat: 51.5331, lng: -0.1234 },
  "London Liverpool Street": { lat: 51.5177, lng: -0.0820 },
  "London Bridge": { lat: 51.5045, lng: -0.0857 },
  "Manchester Piccadilly": { lat: 53.4778, lng: -2.2292 },
  "Manchester Victoria": { lat: 53.4883, lng: -2.2381 },
  "Birmingham New Street": { lat: 52.5079, lng: -1.9012 },
  "Birmingham Moor Street": { lat: 52.5091, lng: -1.9084 },
  "Leeds": { lat: 53.7955, lng: -1.7481 },
  "Sheffield": { lat: 53.3719, lng: -1.4659 },
  "York": { lat: 53.9576, lng: -1.0821 },
  "Newcastle": { lat: 54.9680, lng: -1.6253 },
  "Edinburgh Waverley": { lat: 55.9523, lng: -3.1879 },
  "Glasgow Central": { lat: 55.8642, lng: -4.2577 },
  "Bristol Temple Meads": { lat: 51.4494, lng: -2.5809 },
  "Cardiff Central": { lat: 51.4755, lng: -3.1764 },
  "Liverpool Lime Street": { lat: 53.4069, lng: -2.9600 },
  "Nottingham": { lat: 52.9397, lng: -1.1384 },
  "Leicester": { lat: 52.6204, lng: -1.1426 },
  "Derby": { lat: 52.9217, lng: -1.4771 },
  "Coventry": { lat: 52.4681, lng: -1.5413 },
  "Reading": { lat: 51.4367, lng: -0.9720 },
  "Oxford": { lat: 51.7551, lng: -1.2618 },
  "Cambridge": { lat: 52.1275, lng: 0.1367 },
  "Brighton": { lat: 50.8611, lng: -0.0820 },
  "Southampton Central": { lat: 50.9058, lng: -1.4139 },
  "Portsmouth Harbour": { lat: 50.7970, lng: -1.1110 },
  "Exeter St Davids": { lat: 50.7185, lng: -3.5340 },
  "Plymouth": { lat: 50.3625, lng: -4.1413 },
  "Doncaster": { lat: 53.5236, lng: -1.1408 },
  "Huddersfield": { lat: 53.6453, lng: -1.7788 },
  "Bradford Interchange": { lat: 53.7931, lng: -1.7593 },
  "Wakefield Westgate": { lat: 53.6805, lng: -1.4970 },
  "Harrogate": { lat: 55.8891, lng: -1.5350 },
  "Scarborough": { lat: 54.3785, lng: -0.4888 },
  "Hull": { lat: 53.7459, lng: -0.3386 },
  "Lincoln Central": { lat: 53.2282, lng: -0.5539 },
  "Peterborough": { lat: 52.5712, lng: -0.2425 },
  "Ipswich": { lat: 52.0528, lng: 1.1434 },
  "Norwich": { lat: 52.6277, lng: 1.2978 },
  "Chelmsford": { lat: 51.8948, lng: 0.4694 },
  "Luton Airport Parkway": { lat: 51.8748, lng: -0.3842 },
  "Watford Junction": { lat: 51.6519, lng: -0.3965 },
  "Milton Keynes Central": { lat: 52.0367, lng: -0.7594 },
  "Northampton": { lat: 52.2366, lng: -0.8933 },
  "Rugby": { lat: 52.3718, lng: -1.2662 },
  "Crewe": { lat: 53.0929, lng: -2.4357 },
  "Stoke-on-Trent": { lat: 53.0024, lng: -2.1853 },
  "Chester": { lat: 53.1923, lng: -2.8915 },
  "Wrexham General": { lat: 53.0445, lng: -2.9958 },
  "Shrewsbury": { lat: 52.7092, lng: -2.7505 },
  "Wolverhampton": { lat: 52.5886, lng: -2.1299 },
  "Walsall": { lat: 52.5835, lng: -1.9823 },
  "Preston": { lat: 53.7631, lng: -2.7063 },
  "Blackpool North": { lat: 53.8170, lng: -3.0569 },
  "Lancaster": { lat: 54.0664, lng: -2.8007 },
  "Penrith": { lat: 54.6632, lng: -2.7498 },
  "Carlisle": { lat: 54.8929, lng: -2.9380 },
  "Macclesfield": { lat: 53.2596, lng: -2.1378 },
  "Stockport": { lat: 53.4091, lng: -2.1614 },
  "Bolton": { lat: 53.5768, lng: -2.4269 },
  "Wigan North Western": { lat: 53.5452, lng: -2.6303 },
  "Warrington Bank Quay": { lat: 53.3904, lng: -2.5954 },
  "Aberdeen": { lat: 57.1425, lng: -2.0978 },
  "Dundee": { lat: 56.9611, lng: -2.9697 },
  "Perth": { lat: 56.3964, lng: -3.3983 },
  "Stirling": { lat: 56.1245, lng: -3.9398 },
  "Inverness": { lat: 57.4767, lng: -4.2255 },
  "Fort William": { lat: 56.8224, lng: -5.1076 },
};

// Calculate distance between two stations using Haversine formula (km)
export function calculateDistance(fromStation: string, toStation: string): number {
  const from = STATION_COORDINATES[fromStation];
  const to = STATION_COORDINATES[toStation];
  if (!from || !to) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Suggest price for a journey based on distance
export function getSuggestedPrice(fromStation: string, toStation: string): number {
  const distanceKm = calculateDistance(fromStation, toStation);

  // Pricing tiers
  if (distanceKm < 50) return 1000;       // < 50km = £10
  if (distanceKm < 100) return 1500;      // 50-100km = £15
  if (distanceKm < 150) return 2000;      // 100-150km = £20
  if (distanceKm < 200) return 2500;      // 150-200km = £25
  if (distanceKm < 300) return 3500;      // 200-300km = £35
  return 4500;                             // 300km+ = £45
}

// Commission as a fraction (20%). Single source of truth.
export const RIDEDROP_COMMISSION = 0.2;

// Trust tier and the corresponding max declared parcel value (in pence).
// Mirrors the SQL function public.max_declared_value_pence() — keep in sync.
export type TrustTier = 'basic' | 'verified' | 'trusted';
export const MAX_DECLARED_VALUE_PENCE: Record<TrustTier, number> = {
  basic: 5_000,       // £50 — new users
  verified: 25_000,   // £250 — ID-verified users
  trusted: 100_000,   // £1,000 — 5+ deliveries, rating >= 4.5
};
