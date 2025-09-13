import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// frontend/src/stores/booking-store.ts
export interface BookingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
}

export interface BookingData {
  // Service selection
  service_type?: 'mini_move' | 'standard_delivery' | 'specialty_item';
  mini_move_package_id?: string;
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
  
  // Date and time
  pickup_date?: string;
  pickup_time?: 'morning' | 'afternoon' | 'evening';
  
  // Addresses
  pickup_address?: BookingAddress;
  delivery_address?: BookingAddress;
  
  // Customer info (for guest checkout)
  customer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  
  // Additional options
  special_instructions?: string;
  coi_required?: boolean;
  
  // Pricing
  pricing_data?: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
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
}

const initialBookingData: BookingData = {
  service_type: 'mini_move',
  pickup_time: 'morning',
  coi_required: false,
  include_packing: false,
  include_unpacking: false,
  is_same_day_delivery: false,
};

export const useBookingWizard = create<BookingWizardState & BookingWizardActions>()(
  persist(
    (set, get) => ({
      // State
      currentStep: 1,
      isLoading: false,
      bookingData: initialBookingData,
      errors: {},
      isBookingComplete: false,
      completedBookingNumber: undefined,

      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),
      
      nextStep: () => set((state) => ({ 
        currentStep: Math.min(state.currentStep + 1, 5) 
      })),
      
      previousStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 1) 
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
      
      resetWizard: () => {
        console.log('🔄 Resetting booking wizard');
        
        const newState = {
          currentStep: 1,
          isLoading: false,
          bookingData: { ...initialBookingData },
          errors: {},
          isBookingComplete: false,
          completedBookingNumber: undefined
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
        const { bookingData } = get();
        
        switch (step) {
          case 1: return true; // Service selection always available
          case 2: // Date/time step
            return !!bookingData.service_type && (
              (bookingData.service_type === 'mini_move' && !!bookingData.mini_move_package_id) ||
              (bookingData.service_type === 'standard_delivery' && !!bookingData.standard_delivery_item_count) ||
              (bookingData.service_type === 'specialty_item' && !!bookingData.specialty_item_ids?.length)
            );
          case 3: // Address step
            return !!bookingData.pickup_date;
          case 4: // Customer info step
            return !!bookingData.pickup_address && !!bookingData.delivery_address;
          case 5: // Review/payment step
            return !!bookingData.customer_info?.email;
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
        completedBookingNumber: state.completedBookingNumber
      })
    }
  )
);