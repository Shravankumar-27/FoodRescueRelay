export interface ApiSuccess<T> {
  success: true;
  data: T;
  request_id: string;
}

export type Role = "DONOR" | "RECEIVER" | "ADMIN";

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface OrganizationOut {
  id: string;
  name: string;
  organization_type: string;
  verification_status: string;
  trust_score?: number;
  rank_badge?: string;
}

export interface LoginData {
  token: string;
  token_type: string;
  user: UserOut;
  organization: OrganizationOut;
}

export interface MeData {
  user: UserOut;
  organization: OrganizationOut;
}

export type RescueStatus =
  | "POSTED"
  | "MATCHING"
  | "OFFERED"
  | "CLAIMED"
  | "COLLECTED"
  | "DELIVERED"
  | "EXPIRED"
  | "CANCELLED";

export interface FoodItem {
  name: string;
  quantity_servings: number;
  dietary_type: string;
  food_category?: string;
  allergens: string[];
  allergen_info_unknown: boolean;
}

export type FoodItemIn = FoodItem;

export interface RescueCreateBody {
  food_items: FoodItemIn[];
  handling_type: string;
  handling_notes: string | null;
  untouched_confirmed: boolean;
  served_or_mixed_with_waste: boolean;
  packaging_available: boolean;
  safety_attestation: boolean;
  prepared_at: string;
  pickup_by: string;
  idempotency_key: string;
  locality?: string | null;
  private_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface StatusEvent {
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
}

export interface RescueDetail {
  collected_servings?: number | null;
  id: string;
  display_id: string;
  status: RescueStatus;
  created_at: string;
  prepared_at: string;
  pickup_by: string;
  seconds_remaining: number;
  handling_type: string;
  handling_notes: string | null;
  packaging_available: boolean;
  untouched_confirmed: boolean;
  total_servings: number;
  dietary_type: string;
  locality: string | null;
  food_items: FoodItem[];
  allergen_notice: string | null;
  safety_notice: string;
  donor_organization_name?: string;
  private_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  donor_phone?: string | null;
  status_events?: StatusEvent[];
  pickup_code?: string | null;
  claimed_receiver?: { name: string | null; locality: string | null } | null;
  impact?: {
    delivered_servings: number;
    rejected_servings: number | null;
    collected_servings: number | null;
    confirmed_kg: number | null;
    minutes_to_delivery: number | null;
  } | null;
  matching_error?: boolean;
}

export interface RescueSummary {
  id: string;
  display_id: string;
  status: RescueStatus;
  pickup_by: string;
  total_servings: number;
  created_at: string;
  locality: string | null;
  delivered_servings: number | null;
}

// Item returned by GET /offers/history (receiver's ACCEPTED offers).
export interface ReceiverHistoryItem {
  offer_id: string;
  rescue_id: string;
  rescue_display_id: string;
  status: RescueStatus;
  delivered_servings: number | null;
  pickup_by: string;
}

export interface MatchCandidate {
  receiver_name: string;
  locality: string;
  feasible: boolean;
  rejection_reasons: string[];
  distance_km: number;
  travel_minutes: number;
  score: number;
  factors: Record<string, number>;
  why: string[];
}

export interface OfferAvailable {
  donor_name: string;
  donor_id: string;
  rank_badge: string;
  trust_score: number;
  factors: Record<string, number>;
  id: string;
  rescue_id: string;
  rescue_display_id: string;
  locality: string | null;
  total_servings: number;
  food_items: FoodItem[];
  handling_type: string;
  handling_notes: string | null;
  packaging_available: boolean;
  untouched_confirmed: boolean;
  prepared_at: string;
  pickup_by: string;
  seconds_remaining: number;
  expires_at: string;
  seconds_to_respond: number;
  estimated_distance_km: number;
  estimated_travel_minutes: number;
  why: string[];
  safety_notice: string;
  is_direct_offer?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface CapacityData {
  accepted_dietary_types?: string[];
  accepted_food_categories?: string[];
  excluded_allergens?: string[];
  description?: string;
  available: boolean;
  max_servings: number;
  available_servings: number;
  accepts_veg: boolean;
  accepts_non_veg: boolean;
  transport_available: boolean;
  need_level: "LOW" | "MEDIUM" | "HIGH";
  updated_at: string;
}

export interface ImpactSummary {
  weekly: { week: string; meals: number; co2e_kg: number }[];
  food_kg_estimate: number;
  co2e_kg_estimate: number;
  household_meal_equivalents: number;
  assumptions: string;
  meals_rescued_month: number;
  total_meals_rescued: number;
  completed_rescues: number;
  completion_rate: number;
  avg_completion_minutes: number | null;
  recent_completed: {
    display_id: string;
    delivered_servings: number;
    delivered_at: string;
    receiver_name: string;
  }[];
  methodology_note: string;
}

export interface AdminOrg {
  id: string;
  name: string;
  organization_type: string;
  verification_status: string;
  locality: string | null;
  reliability: number;
  created_at: string;
}

export interface AdminRescue {
  id: string;
  display_id: string;
  status: RescueStatus;
  donor_organization_name: string;
  total_servings: number;
  pickup_by: string;
  created_at: string;
}

export interface NearbyReceiver {
  accepted_dietary_types: string[];
  accepted_food_categories: string[];
  description: string;
  rating: number | null;
  rating_count: number;
  id: string;
  name: string;
  locality: string;
  latitude: number;
  longitude: number;
  organization_type: string;
  verification_status: string;
  reliability: number;
  trust_score: number;
  rank_badge: string;
  distance_km: number;
  available: boolean;
  max_servings: number;
  available_servings: number;
  need_level: string;
  transport_available: boolean;
  accepts_veg: boolean;
  accepts_non_veg: boolean;
}

export interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  is_suggested: boolean;
  created_at: string;
}

export interface ChatData {
  partner_name?: string;
  messages: ChatMessage[];
  suggested: string[];
}

export interface LeaderboardEntry {
  trust_score: number;
  rating: number | null;
  rating_count: number;
  completion_rate: number | null;
  rank: number;
  name: string;
  locality: string;
  rescues: number;
  meals: number;
  reliability: number;
  badge: string;
}

export interface LeaderboardData {
  donors: LeaderboardEntry[];
  receivers: LeaderboardEntry[];
}

export interface PlatformStats {
  total_rescues: number;
  delivered: number;
  active: number;
  total_meals: number;
  total_orgs: number;
  co2e_kg: number;
  water_saved_liters: number;
  families_fed_estimate: number;
}
