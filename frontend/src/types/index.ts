// frontend/src/types/index.ts
export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  stripe_customer_id: string;
  total_bookings: number;
  total_spent_cents: number;
  total_spent_dollars: number;
  preferred_pickup_time: 'morning' | 'morning_specific' | 'no_time_preference';
  email_notifications: boolean;
  sms_notifications: boolean;
  is_vip: boolean;
  last_booking_at: string | null;
}

export interface AuthResponse {
  message: string;
  user: DjangoUser;
  customer_profile: CustomerProfile;
  csrf_token: string;
}

export interface MiniMovePackage {
  id: string;
  package_type: 'petite' | 'standard' | 'full';
  name: string;
  description: string;
  base_price_dollars: number;
  max_items: number | null;
  coi_included: boolean;
  coi_fee_dollars: number;
  is_most_popular: boolean;
  priority_scheduling: boolean;
  protective_wrapping: boolean;
}

export interface SpecialtyItem {
  id: string;
  item_type: string;
  name: string;
  description: string;
  price_dollars: number;
  special_handling: boolean;
}

export interface ServiceCatalog {
  mini_move_packages: MiniMovePackage[];
  standard_delivery: {
    price_per_item_dollars: number;
    minimum_items: number;
    minimum_charge_dollars: number;
    same_day_flat_rate_dollars: number;
    max_weight_per_item_lbs: number;
  } | null;
  specialty_items: SpecialtyItem[];
}

export interface APIError {
  message: string;
  field_errors?: Record<string, string[]>;
}

export interface BookingWizardState {
  currentStep: number;
  isLoading: boolean;
  bookingData: BookingData;
  errors: Record<string, string>;
}

export interface BookingData {
  service_type?: 'mini_move' | 'standard_delivery' | 'specialty_item' | 'blade_transfer';
  mini_move_package_id?: string;
  package_type?: 'petite' | 'standard' | 'full';
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_items?: Array<{
  item_id: string;
  quantity: number;
}>;
  
  blade_airport?: 'JFK' | 'EWR';
  blade_flight_date?: string;
  blade_flight_time?: string;
  blade_bag_count?: number;
  blade_ready_time?: string;
  
  pickup_date?: string;
  pickup_time?: 'morning' | 'morning_specific' | 'no_time_preference';
  specific_pickup_hour?: number;
  pickup_address?: BookingAddress;
  delivery_address?: BookingAddress;
  customer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  special_instructions?: string;
  coi_required?: boolean;
  is_outside_core_area?: boolean;
  pricing_data?: {
    base_price_dollars: number;
    same_day_delivery_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number;
    geographic_surcharge_dollars: number;
    time_window_surcharge_dollars: number;
    total_price_dollars: number;
  };
}

export interface BookingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
}

export interface Payment {
  id: string;
  booking_number: string;
  customer_name: string;
  amount_cents: number;
  amount_dollars: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripe_payment_intent_id: string;
  stripe_charge_id: string;
  failure_reason?: string;
  processed_at: string | null;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_booking_number: string;
  amount_cents: number;
  amount_dollars: number;
  reason: string;
  status: 'requested' | 'approved' | 'denied' | 'completed';
  requested_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RefundRequest {
  payment_id: string;
  amount_cents: number;
  reason: string;
}

// Onfleet Integration Types
export interface OnfleetTask {
  task_type: 'pickup' | 'dropoff';
  tracking_url: string;
  status: 'created' | 'assigned' | 'active' | 'completed' | 'failed' | 'deleted';
  worker_name: string;
  completed_at: string | null;
  started_at: string | null;
}

export interface BookingWithTracking {
  id: string;
  booking_number: string;
  customer_name: string;
  service_type: string;
  pickup_date: string;
  pickup_time: string;
  status: 'pending' | 'confirmed' | 'paid' | 'in_progress' | 'completed' | 'cancelled';
  pickup_address: BookingAddress;
  delivery_address: BookingAddress;
  special_instructions: string;
  coi_required: boolean;
  total_price_dollars: number;
  pricing_breakdown: any;
  payment_status: string;
  can_rebook: boolean;
  onfleet_tasks: OnfleetTask[];
  created_at: string;
  updated_at: string;
}