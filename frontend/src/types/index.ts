// Django User model interface
export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

// CustomerProfile interface
export interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  stripe_customer_id: string;
  total_bookings: number;
  total_spent_cents: number;
  total_spent_dollars: number;
  preferred_pickup_time: 'morning' | 'afternoon' | 'evening';
  email_notifications: boolean;
  sms_notifications: boolean;
  is_vip: boolean;
  last_booking_at: string | null;
}

// Authentication responses
export interface AuthResponse {
  message: string;
  user: DjangoUser;
  customer_profile: CustomerProfile;
  csrf_token: string;
}

// Service types
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
  features: {
    priority_scheduling: boolean;
    protective_wrapping: boolean;
  };
}

export interface SpecialtyItem {
  id: string;
  item_type: string;
  name: string;
  description: string;
  price_dollars: number;
  requires_van_schedule: boolean;
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

// API Error types
export interface APIError {
  message: string;
  field_errors?: Record<string, string[]>;
}

// Add these booking-related types to the existing file

export interface BookingWizardState {
  currentStep: number;
  isLoading: boolean;
  bookingData: BookingData;
  errors: Record<string, string>;
}

export interface BookingData {
  service_type: 'mini_move' | 'standard_delivery' | 'specialty_item';
  mini_move_package_id?: string;
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
  pickup_date?: string;
  pickup_time?: 'morning' | 'afternoon' | 'evening';
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
  pricing_data?: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
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