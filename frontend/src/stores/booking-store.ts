// frontend/src/stores/booking-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BookingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
}

export interface BookingData {
  service_type?: 'mini_move' | 'standard_delivery' | 'specialty_item';
  mini_move_package_id?: string;
  package_type?: 'petite' | 'standard' | 'full';
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
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
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number;
    geographic_surcharge_dollars: number;
    time_window_surcharge_dollars: number;
    total_price_dollars: number;
  };
}

interface BookingWizardState {
  currentStep: number;
  isLoading: boolean;
  bookingData: BookingData;
  errors: Record<string, string>;
  isBookingComplete: boolean;
  completedBookingNumber?: string;
  userId?: string;
  isGuestMode: boolean;
  lastResetTimestamp?: number;
}

interface BookingWizardActions {
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateBookingData: (data: Partial<BookingData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  resetWizard: () => void;
  secureReset: () => void;
  canProceedToStep: (step: number) => boolean;
  setBookingComplete: (bookingNumber: string) => void;
  initializeForUser: (userId?: string, isGuest?: boolean) => void;
}

const initialBookingData: BookingData = {
  service_type: 'mini_move',
  pickup_time: 'morning',
  coi_required: false,
  include_packing: false,
  include_unpacking: false,
  is_same_day_delivery: false,
  is_outside_core_area: false,
};

const STORE_VERSION = 3; // Increment for security changes
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

// SECURITY: Data validation and sanitization
const sanitizeBookingData = (data: Partial<BookingData>): Partial<BookingData> => {
  const sanitized: Partial<BookingData> = {};
  
  // Validate service types
  if (data.service_type && ['mini_move', 'standard_delivery', 'specialty_item'].includes(data.service_type)) {
    sanitized.service_type = data.service_type;
  }
  
  // Validate package types
  if (data.package_type && ['petite', 'standard', 'full'].includes(data.package_type)) {
    sanitized.package_type = data.package_type;
  }
  
  // Validate pickup time
  if (data.pickup_time && ['morning', 'morning_specific', 'no_time_preference'].includes(data.pickup_time)) {
    sanitized.pickup_time = data.pickup_time;
  }
  
  // Sanitize string fields with length limits
  if (data.special_instructions) {
    sanitized.special_instructions = data.special_instructions.substring(0, 500).trim();
  }
  
  // Validate boolean fields
  ['include_packing', 'include_unpacking', 'is_same_day_delivery', 'coi_required', 'is_outside_core_area'].forEach(field => {
    if (typeof data[field as keyof BookingData] === 'boolean') {
      (sanitized as any)[field] = data[field as keyof BookingData];
    }
  });
  
  // Validate numeric fields
  if (typeof data.standard_delivery_item_count === 'number' && data.standard_delivery_item_count >= 1 && data.standard_delivery_item_count <= 50) {
    sanitized.standard_delivery_item_count = Math.floor(data.standard_delivery_item_count);
  }
  
  if (typeof data.specific_pickup_hour === 'number' && data.specific_pickup_hour >= 8 && data.specific_pickup_hour <= 17) {
    sanitized.specific_pickup_hour = Math.floor(data.specific_pickup_hour);
  }
  
  // Validate date format (YYYY-MM-DD)
  if (data.pickup_date && /^\d{4}-\d{2}-\d{2}$/.test(data.pickup_date)) {
    const date = new Date(data.pickup_date);
    if (!isNaN(date.getTime()) && date >= new Date()) {
      sanitized.pickup_date = data.pickup_date;
    }
  }
  
  // Validate UUIDs for IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (data.mini_move_package_id && uuidRegex.test(data.mini_move_package_id)) {
    sanitized.mini_move_package_id = data.mini_move_package_id;
  }
  
  if (data.specialty_item_ids && Array.isArray(data.specialty_item_ids)) {
    sanitized.specialty_item_ids = data.specialty_item_ids.filter(id => uuidRegex.test(id));
  }
  
  // Validate addresses
  if (data.pickup_address) {
    sanitized.pickup_address = sanitizeAddress(data.pickup_address);
  }
  if (data.delivery_address) {
    sanitized.delivery_address = sanitizeAddress(data.delivery_address);
  }
  
  // SECURITY: Validate customer info but don't store sensitive data
  if (data.customer_info) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\(\)\+]{10,15}$/;
    
    if (data.customer_info.email && emailRegex.test(data.customer_info.email)) {
      sanitized.customer_info = {
        first_name: data.customer_info.first_name?.substring(0, 50).trim() || '',
        last_name: data.customer_info.last_name?.substring(0, 50).trim() || '',
        email: data.customer_info.email.trim(),
        phone: data.customer_info.phone && phoneRegex.test(data.customer_info.phone) 
          ? data.customer_info.phone.trim() 
          : ''
      };
    }
  }
  
  // Validate pricing data (read-only, from server)
  if (data.pricing_data && typeof data.pricing_data === 'object') {
    const pricing = data.pricing_data;
    if (typeof pricing.total_price_dollars === 'number' && pricing.total_price_dollars >= 0) {
      sanitized.pricing_data = pricing;
    }
  }
  
  return sanitized;
};

const sanitizeAddress = (address: BookingAddress): BookingAddress => {
  return {
    address_line_1: address.address_line_1?.substring(0, 100).trim() || '',
    address_line_2: address.address_line_2?.substring(0, 100).trim(),
    city: address.city?.substring(0, 50).trim() || '',
    state: ['NY', 'CT', 'NJ'].includes(address.state) ? address.state : 'NY',
    zip_code: address.zip_code?.replace(/\D/g, '').substring(0, 10) || ''
  };
};

export const useBookingWizard = create<BookingWizardState & BookingWizardActions>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      isLoading: false,
      bookingData: initialBookingData,
      errors: {},
      isBookingComplete: false,
      completedBookingNumber: undefined,
      userId: undefined,
      isGuestMode: true,
      lastResetTimestamp: Date.now(),

      setCurrentStep: (step) => {
        // Validate step range
        const validStep = Math.max(0, Math.min(step, 5));
        set({ currentStep: validStep });
      },
      
      nextStep: () => set((state) => {
        const maxStep = 5;
        let nextStep = state.currentStep + 1;
        
        // VALIDATION: Can't leave service selection without package
        if (state.currentStep === 1 && state.bookingData.service_type === 'mini_move' && !state.bookingData.mini_move_package_id) {
          console.error('Cannot proceed: No package selected for mini move');
          return state;
        }
        
        // Skip customer info step (4) for authenticated users
        if (!state.isGuestMode && nextStep === 4) {
          nextStep = 5;
        }
        
        return { currentStep: Math.min(nextStep, maxStep) };
      }),
      
      previousStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 0)
      })),
      
      // SECURITY: Enhanced with validation
      updateBookingData: (data) => {
        const sanitizedData = sanitizeBookingData(data);
        console.log('Updating booking data with sanitized input');
        
        set((state) => ({
          bookingData: { ...state.bookingData, ...sanitizedData }
        }));
      },
      
      setLoading: (loading) => set({ isLoading: !!loading }),
      
      setError: (field, message) => {
        // Sanitize error messages
        const sanitizedField = field.substring(0, 50);
        const sanitizedMessage = message.substring(0, 200);
        
        set((state) => ({
          errors: { ...state.errors, [sanitizedField]: sanitizedMessage }
        }));
      },
      
      clearError: (field) => set((state) => {
        const newErrors = { ...state.errors };
        delete newErrors[field];
        return { errors: newErrors };
      }),
      
      clearErrors: () => set({ errors: {} }),
      
      setBookingComplete: (bookingNumber) => {
        // Validate booking number format
        const sanitizedBookingNumber = bookingNumber?.substring(0, 20).trim();
        if (sanitizedBookingNumber) {
          set({
            isBookingComplete: true,
            completedBookingNumber: sanitizedBookingNumber
          });
        }
      },
      
      // SECURITY: Race condition protection
      initializeForUser: (providedUserId?, isGuest?) => {
        const userId = providedUserId?.substring(0, 50) || 'guest';
        const guestMode = isGuest !== undefined ? isGuest : true;
        
        const state = get();
        
        console.log('Initializing booking wizard', { userId, guestMode, currentUserId: state.userId });
        
        // SECURITY: Prevent rapid user switching attacks
        const timeSinceLastReset = state.lastResetTimestamp ? 
          Date.now() - state.lastResetTimestamp : Infinity;
        
        if (timeSinceLastReset < 1000) { // Prevent rapid resets
          console.warn('Ignoring rapid user initialization');
          return;
        }
        
        const isStale = state.lastResetTimestamp && 
          (Date.now() - state.lastResetTimestamp > MAX_SESSION_AGE_MS);
        
        if (
          (state.userId && state.userId !== userId && state.userId !== 'guest') ||
          isStale ||
          state.isBookingComplete
        ) {
          console.log('Resetting wizard - user change, stale session, or completed booking');
          set({
            bookingData: { ...initialBookingData },
            errors: {},
            isBookingComplete: false,
            completedBookingNumber: undefined,
            currentStep: 0,
            userId: userId,
            isGuestMode: guestMode,
            lastResetTimestamp: Date.now()
          });
        } else {
          set({ 
            userId: userId,
            isGuestMode: guestMode
          });
        }
      },
      
      resetWizard: () => {
        console.log('Resetting booking wizard completely');
        
        const newState = {
          currentStep: 0,
          isLoading: false,
          bookingData: { ...initialBookingData },
          errors: {},
          isBookingComplete: false,
          completedBookingNumber: undefined,
          userId: 'guest',
          isGuestMode: true,
          lastResetTimestamp: Date.now()
        };
        
        set(newState);
        
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('totetaxi-booking-wizard');
            console.log('Cleared booking wizard from localStorage');
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }
        }
      },
      
      // SECURITY: Nuclear option for security incidents
      secureReset: () => {
        console.log('SECURITY: Performing secure reset of booking wizard');
        
        if (typeof window !== 'undefined') {
          try {
            // Remove all totetaxi booking-related keys
            const allKeys = Object.keys(localStorage);
            allKeys
              .filter(key => key.startsWith('totetaxi-booking'))
              .forEach(key => {
                localStorage.removeItem(key);
                console.log(`SECURITY: Cleared ${key}`);
              });
          } catch (e) {
            console.warn('Could not perform secure localStorage clear:', e);
          }
        }
        
        set({
          currentStep: 0,
          isLoading: false,
          bookingData: { ...initialBookingData },
          errors: {},
          isBookingComplete: false,
          completedBookingNumber: undefined,
          userId: 'guest',
          isGuestMode: true,
          lastResetTimestamp: Date.now()
        });
      },
      
      canProceedToStep: (step) => {
        const { bookingData, isGuestMode } = get();
        
        switch (step) {
          case 0: return true;
          case 1: return true;
          case 2:
            return !!bookingData.service_type && (
              (bookingData.service_type === 'mini_move' && !!bookingData.mini_move_package_id) ||
              (bookingData.service_type === 'standard_delivery' && !!bookingData.standard_delivery_item_count) ||
              (bookingData.service_type === 'specialty_item' && !!bookingData.specialty_item_ids?.length)
            );
          case 3:
            return !!bookingData.pickup_date;
          case 4:
            return !!bookingData.pickup_address && !!bookingData.delivery_address;
          case 5:
            if (isGuestMode) {
              return !!bookingData.customer_info?.email;
            } else {
              return !!bookingData.pickup_address && !!bookingData.delivery_address;
            }
          default:
            return false;
        }
      }
    }),
    {
      name: 'totetaxi-booking-wizard',
      version: STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        if (version !== STORE_VERSION) {
          console.log(`Store version mismatch (${version} !== ${STORE_VERSION}), resetting to defaults`);
          return {
            currentStep: 0,
            isLoading: false,
            bookingData: { ...initialBookingData },
            errors: {},
            isBookingComplete: false,
            completedBookingNumber: undefined,
            userId: 'guest',
            isGuestMode: true,
            lastResetTimestamp: Date.now()
          };
        }
        
        if (persistedState?.lastResetTimestamp) {
          const age = Date.now() - persistedState.lastResetTimestamp;
          if (age > MAX_SESSION_AGE_MS) {
            console.log('Persisted state is stale (>24h), resetting');
            return {
              currentStep: 0,
              isLoading: false,
              bookingData: { ...initialBookingData },
              errors: {},
              isBookingComplete: false,
              completedBookingNumber: undefined,
              userId: 'guest',
              isGuestMode: true,
              lastResetTimestamp: Date.now()
            };
          }
        }
        
        return persistedState;
      },
      // SECURITY: Exclude PII from localStorage persistence
      partialize: (state) => ({
        bookingData: {
          ...state.bookingData,
          customer_info: undefined // Don't persist customer PII
        },
        currentStep: state.currentStep,
        isBookingComplete: state.isBookingComplete,
        completedBookingNumber: state.completedBookingNumber,
        userId: state.userId,
        isGuestMode: state.isGuestMode,
        lastResetTimestamp: state.lastResetTimestamp
      })
    }
  )
);