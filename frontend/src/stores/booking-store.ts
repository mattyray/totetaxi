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
  package_type?: 'petite' | 'standard' | 'full'; // NEW: Track package type
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
  pickup_date?: string;
  pickup_time?: 'morning' | 'morning_specific' | 'no_time_preference'; // UPDATED: New options
  specific_pickup_hour?: number; // NEW: For 1-hour window selection
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
  is_outside_core_area?: boolean; // NEW: Geographic surcharge tracking
  pricing_data?: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number; // NEW: Tax on organizing services
    geographic_surcharge_dollars: number; // NEW: $175 distance surcharge
    time_window_surcharge_dollars: number; // NEW: 1-hour window surcharge
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
  pickup_time: 'morning', // Default to morning only
  coi_required: false,
  include_packing: false,
  include_unpacking: false,
  is_same_day_delivery: false,
  is_outside_core_area: false, // NEW: Default to false
};

export const useBookingWizard = create<BookingWizardState & BookingWizardActions>()(
  persist(
    (set, get) => ({
      // State - ALWAYS START AT STEP 0 (auth choice)
      currentStep: 0,
      isLoading: false,
      bookingData: initialBookingData,
      errors: {},
      isBookingComplete: false,
      completedBookingNumber: undefined,
      userId: undefined,
      isGuestMode: true,

      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),
      
      nextStep: () => set((state) => {
        const maxStep = state.isGuestMode ? 5 : 4;
        return { currentStep: Math.min(state.currentStep + 1, maxStep) };
      }),
      
      previousStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 0) // Can go back to step 0
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
        
        console.log('🔄 Initializing booking wizard', { userId, guestMode, currentUserId: state.userId });
        
        // If switching between different users, reset but stay at current step
        if (state.userId && state.userId !== userId && state.userId !== 'guest') {
          console.log('👤 Different user detected, resetting data');
          set({
            bookingData: { ...initialBookingData },
            errors: {},
            isBookingComplete: false,
            completedBookingNumber: undefined,
            userId: userId,
            isGuestMode: guestMode
          });
        } else {
          // Just update user info
          set({ 
            userId: userId,
            isGuestMode: guestMode
          });
        }
      },
      
      resetWizard: () => {
        console.log('🔄 Resetting booking wizard');
        
        const newState = {
          currentStep: 0, // Always reset to auth choice step
          isLoading: false,
          bookingData: { ...initialBookingData },
          errors: {},
          isBookingComplete: false,
          completedBookingNumber: undefined,
          userId: 'guest',
          isGuestMode: true
        };
        
        set(newState);
        
        // Force clear localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('totetaxi-booking-wizard');
            console.log('🗑️ Cleared booking wizard from localStorage');
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }
        }
      },
      
      canProceedToStep: (step) => {
        const { bookingData, isGuestMode } = get();
        
        switch (step) {
          case 0: return true; // Auth choice always available
          case 1: return true; // Service selection always available after auth choice
          case 2: // Date/time step
            return !!bookingData.service_type && (
              (bookingData.service_type === 'mini_move' && !!bookingData.mini_move_package_id) ||
              (bookingData.service_type === 'standard_delivery' && !!bookingData.standard_delivery_item_count) ||
              (bookingData.service_type === 'specialty_item' && !!bookingData.specialty_item_ids?.length)
            );
          case 3: // Address step
            return !!bookingData.pickup_date;
          case 4: // Customer info step (required for guests only)
            return !!bookingData.pickup_address && !!bookingData.delivery_address;
          case 5: // Review/payment step
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
      partialize: (state) => ({
        bookingData: state.bookingData,
        currentStep: state.currentStep,
        isBookingComplete: state.isBookingComplete,
        completedBookingNumber: state.completedBookingNumber,
        userId: state.userId,
        isGuestMode: state.isGuestMode
      })
    }
  )
);