// TypeScript shape of the database — kept in sync by hand with supabase/schema.sql.
//
// Once your dev has the Supabase CLI installed they can regenerate this
// automatically with:  supabase gen types typescript --linked > src/lib/types.ts
// Until then, treat this as the source of truth and update it when schema changes.

export type UserRole = 'sender' | 'carrier' | 'both';

export type JourneyStatus =
  | 'draft'
  | 'ticket_pending'
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
