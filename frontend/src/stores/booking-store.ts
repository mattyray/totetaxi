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
  lastResetTimestamp?: number; // Track when wizard was last reset
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

const STORE_VERSION = 2; // Increment this to force reset all existing stores
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

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

      setCurrentStep: (step) => set({ currentStep: step }),
      
      nextStep: () => set((state) => {
        const maxStep = 5;
        let nextStep = state.currentStep + 1;
        
        // Skip customer info step (4) for authenticated users
        if (!state.isGuestMode && nextStep === 4) {
          nextStep = 5;
        }
        
        return { currentStep: Math.min(nextStep, maxStep) };
      }),
      
      previousStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 0)
      })),
      
      updateBookingData: (data) => set((state) => ({
        bookingData: { ...state.bookingData, ...data }
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (field, message) => set((state) => ({
        errors: { ...state.errors, [field]: message }
      })),
      
      clearError: (field) => set((state) => {
        const newErrors = { ...state.errors };
        delete newErrors[field];
        return { errors: newErrors };
      }),
      
      clearErrors: () => set({ errors: {} }),
      
      setBookingComplete: (bookingNumber) => set({
        isBookingComplete: true,
        completedBookingNumber: bookingNumber
      }),
      
      initializeForUser: (providedUserId?, isGuest?) => {
        const userId = providedUserId || 'guest';
        const guestMode = isGuest !== undefined ? isGuest : true;
        
        const state = get();
        
        console.log('Initializing booking wizard', { userId, guestMode, currentUserId: state.userId });
        
        // Check if session is stale (older than 24 hours)
        const isStale = state.lastResetTimestamp && 
          (Date.now() - state.lastResetTimestamp > MAX_SESSION_AGE_MS);
        
        // Reset if different user, stale session, or booking complete
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
        
        // Force clear from localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('totetaxi-booking-wizard');
            console.log('Cleared booking wizard from localStorage');
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }
        }
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
        // If version mismatch, return fresh state
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
        
        // Check if persisted state is stale
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
      partialize: (state) => ({
        bookingData: state.bookingData,
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