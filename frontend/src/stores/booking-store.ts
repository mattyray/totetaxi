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
  service_type?: 'mini_move' | 'standard_delivery' | 'specialty_item' | 'blade_transfer';
  mini_move_package_id?: string;
  package_type?: 'petite' | 'standard' | 'full';
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  item_description?: string;
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
  transfer_direction?: 'to_airport' | 'from_airport';
  blade_terminal?: string;

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
    pre_discount_total_dollars?: number | null;
    discount_amount_dollars?: number;
  };
  discount_code?: string;
  discount_validated?: boolean;
  discount_info?: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_description: string;
    discount_amount_dollars: number;
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
  pendingPaymentIntentId?: string;
  pendingBookingToken?: string;
  // Stable per-checkout key sent to the server so repeated payment attempts in
  // one session can be linked and de-duplicated during orphan auto-recovery
  // (prevents the two-PI double-charge from becoming two bookings). INC-004.
  cartKey?: string;
  // True once the customer has actually submitted the Stripe payment confirmation
  // (set right before stripe.confirmPayment; persisted so it survives a 3DS redirect
  // or crash). Distinguishes "PI created but unpaid" from "payment in flight" so the
  // on-mount recovery only fires for a real charge — not a back-navigation to a
  // created-but-unpaid PI (INC-004 #6).
  paymentConfirmInFlight?: boolean;
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
  updateSpecialtyItemQuantity: (itemId: string, quantity: number) => void;
  getSpecialtyItemQuantity: (itemId: string) => number;
  applyDiscountCode: (code: string, discountInfo: NonNullable<BookingData['discount_info']>) => void;
  clearDiscountCode: () => void;
  setPendingPaymentIntentId: (id: string, bookingToken?: string) => void;
  clearPendingPaymentIntentId: () => void;
  ensureCartKey: () => string;
  setPaymentConfirmInFlight: (inFlight: boolean) => void;
}

const initialBookingData: BookingData = {
  pickup_time: 'morning',
  coi_required: false,
  include_packing: false,
  include_unpacking: false,
  is_same_day_delivery: false,
  is_outside_core_area: false,
  specialty_items: [],
};

const STORE_VERSION = 9;
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
const CHAT_PREFILL_KEY = 'totetaxi-chat-prefill';
const CHAT_PREFILL_TTL_MS = 5 * 60 * 1000;

/**
 * Read chat agent prefill data from localStorage.
 * Returns the prefill data if valid and fresh (<5 min), null otherwise.
 * Cleans up expired entries automatically.
 */
function getChatPrefill(): Partial<BookingData> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed?.timestamp || 0);
    if (parsed?.data && parsed?.timestamp && age < CHAT_PREFILL_TTL_MS) {
      return parsed.data as Partial<BookingData>;
    }
    // Expired — clean up
    localStorage.removeItem(CHAT_PREFILL_KEY);
  } catch {
    try { localStorage.removeItem(CHAT_PREFILL_KEY); } catch {}
  }
  return null;
}

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
      paymentConfirmInFlight: false,
      lastResetTimestamp: Date.now(),

      setCurrentStep: (step) => {
        const validStep = Math.max(0, Math.min(step, 5));
        set({ currentStep: validStep });
      },
      
      nextStep: () => set((state) => {
        const maxStep = 5;
        let nextStep = state.currentStep + 1;
        
        if (state.currentStep === 1 && state.bookingData.service_type === 'mini_move' && !state.bookingData.mini_move_package_id) {
          console.error('Cannot proceed: No package selected for mini move');
          return state;
        }
        
        if (!state.isGuestMode && nextStep === 4) {
          nextStep = 5;
        }
        
        return { currentStep: Math.min(nextStep, maxStep) };
      }),
      
      previousStep: () => set((state) => {
        let prevStep = state.currentStep - 1;
        
        if (!state.isGuestMode && prevStep === 4) {
          prevStep = 3;
        }
        
        return { currentStep: Math.max(prevStep, 0) };
      }),
      
      updateBookingData: (data) => {
        set((state) => ({
          bookingData: { ...state.bookingData, ...data }
        }));
      },
      
      updateSpecialtyItemQuantity: (itemId: string, quantity: number) => {
        set((state) => {
          const currentItems = state.bookingData.specialty_items || [];
          const existing = currentItems.find(item => item.item_id === itemId);
          
          if (quantity === 0) {
            return {
              bookingData: {
                ...state.bookingData,
                specialty_items: currentItems.filter(item => item.item_id !== itemId)
              }
            };
          }
          
          if (existing) {
            return {
              bookingData: {
                ...state.bookingData,
                specialty_items: currentItems.map(item =>
                  item.item_id === itemId ? { ...item, quantity } : item
                )
              }
            };
          } else {
            return {
              bookingData: {
                ...state.bookingData,
                specialty_items: [...currentItems, { item_id: itemId, quantity }]
              }
            };
          }
        });
      },
      
      getSpecialtyItemQuantity: (itemId: string) => {
        const state = get();
        const item = state.bookingData.specialty_items?.find(i => i.item_id === itemId);
        return item?.quantity || 0;
      },

      applyDiscountCode: (code, discountInfo) => {
        set((state) => ({
          bookingData: {
            ...state.bookingData,
            discount_code: code,
            discount_validated: true,
            discount_info: discountInfo,
          }
        }));
      },

      clearDiscountCode: () => {
        set((state) => ({
          bookingData: {
            ...state.bookingData,
            discount_code: undefined,
            discount_validated: false,
            discount_info: undefined,
          }
        }));
      },

      setPendingPaymentIntentId: (id, bookingToken) => set({
        pendingPaymentIntentId: id,
        pendingBookingToken: bookingToken,
      }),
      clearPendingPaymentIntentId: () => set({
        pendingPaymentIntentId: undefined,
        pendingBookingToken: undefined,
        // Clear the cart key on completion so a later booking in the same browser
        // starts a fresh key — a stale key could otherwise make _find_sibling_booking
        // falsely match the prior completed booking and refuse a real orphan (INC-004 #5).
        cartKey: undefined,
        paymentConfirmInFlight: false,
      }),

      ensureCartKey: () => {
        const existing = get().cartKey;
        if (existing) return existing;
        const generate = () => {
          try {
            if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
              return crypto.randomUUID();
            }
          } catch {
            // fall through to manual generation
          }
          return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        };
        const key = generate();
        set({ cartKey: key });
        return key;
      },

      setPaymentConfirmInFlight: (inFlight) => set({ paymentConfirmInFlight: !!inFlight }),

      setLoading: (loading) => set({ isLoading: !!loading }),
      
      setError: (field, message) => {
        set((state) => ({
          errors: { ...state.errors, [field]: message }
        }));
      },
      
      clearError: (field) => set((state) => {
        const newErrors = { ...state.errors };
        delete newErrors[field];
        return { errors: newErrors };
      }),
      
      clearErrors: () => set({ errors: {} }),
      
      setBookingComplete: (bookingNumber) => {
        if (bookingNumber) {
          set({
            isBookingComplete: true,
            completedBookingNumber: bookingNumber
          });
        }
      },
      
      // ✅ FIX: Properly handle guest mode updates
      initializeForUser: (providedUserId?, isGuest?) => {
        const userId = providedUserId || 'guest';
        const guestMode = isGuest !== undefined ? isGuest : (userId === 'guest');

        const state = get();

        const timeSinceLastReset = state.lastResetTimestamp ?
          Date.now() - state.lastResetTimestamp : Infinity;

        // ✅ Allow update if guest mode changed
        if (timeSinceLastReset < 1000 && state.isGuestMode === guestMode) {
          // Still apply chat prefill if available (handles race where prefill
          // was set after the previous initializeForUser call)
          const chatPrefill = getChatPrefill();
          if (chatPrefill) {
            set((state) => ({
              bookingData: { ...state.bookingData, ...chatPrefill }
            }));
          }
          return;
        }

        const isStale = state.lastResetTimestamp &&
          (Date.now() - state.lastResetTimestamp > MAX_SESSION_AGE_MS);

        if (
          (state.userId && state.userId !== userId && state.userId !== 'guest') ||
          isStale ||
          state.isBookingComplete ||
          state.isGuestMode !== guestMode  // ✅ Also reset if guest mode changes
        ) {
          // Merge chat prefill into the reset so it survives the wipe
          const chatPrefill = getChatPrefill();
          set({
            bookingData: chatPrefill
              ? { ...initialBookingData, ...chatPrefill }
              : { ...initialBookingData },
            errors: {},
            isBookingComplete: false,
            completedBookingNumber: undefined,
            currentStep: 0,
            userId: userId,
            isGuestMode: guestMode,
            lastResetTimestamp: Date.now()
          });
        } else {
          // ✅ Always update both userId and guestMode together
          const chatPrefill = getChatPrefill();
          if (chatPrefill) {
            set((state) => ({
              bookingData: { ...state.bookingData, ...chatPrefill },
              userId: userId,
              isGuestMode: guestMode,
              lastResetTimestamp: Date.now()
            }));
          } else {
            set({
              userId: userId,
              isGuestMode: guestMode,
              lastResetTimestamp: Date.now()
            });
          }
        }
      },
      
      // ✅ FIX: Calculate guest mode correctly based on userId
      resetWizard: () => {
        const state = get();
        
        // ✅ FIX: Calculate guest mode from userId, don't preserve old value
        const preservedUserId = state.userId !== 'guest' ? state.userId : 'guest';
        const calculatedGuestMode = preservedUserId === 'guest';
        
        const newState = {
          currentStep: 0,
          isLoading: false,
          bookingData: { ...initialBookingData },
          errors: {},
          isBookingComplete: false,
          completedBookingNumber: undefined,
          userId: preservedUserId,
          isGuestMode: calculatedGuestMode,  // ✅ Use calculated value
          lastResetTimestamp: Date.now(),
          pendingPaymentIntentId: undefined,
          pendingBookingToken: undefined,
          cartKey: undefined,
          paymentConfirmInFlight: false,
        };

        set(newState);
        
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('totetaxi-booking-wizard');
          } catch {
            // localStorage may be unavailable
          }
        }
      },
      
      secureReset: () => {
        if (typeof window !== 'undefined') {
          try {
            const allKeys = Object.keys(localStorage);
            allKeys
              .filter(key => key.startsWith('totetaxi-booking'))
              .forEach(key => localStorage.removeItem(key));
          } catch {
            // localStorage may be unavailable
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
          lastResetTimestamp: Date.now(),
          pendingPaymentIntentId: undefined,
          pendingBookingToken: undefined,
          cartKey: undefined,
          paymentConfirmInFlight: false,
        });
      },

      canProceedToStep: (step) => {
        const { bookingData, isGuestMode } = get();
        
        switch (step) {
          case 0: return true;
          case 1: return true;
          case 2:
            if (bookingData.service_type === 'blade_transfer') {
              return !!(
                bookingData.blade_airport &&
                bookingData.blade_flight_date &&
                bookingData.blade_flight_time &&
                bookingData.blade_bag_count &&
                bookingData.blade_bag_count >= 2
              );
            }
            return !!bookingData.service_type && (
              (bookingData.service_type === 'mini_move' && !!bookingData.mini_move_package_id) ||
              (bookingData.service_type === 'standard_delivery' && !!bookingData.standard_delivery_item_count) ||
              (bookingData.service_type === 'specialty_item' && !!bookingData.specialty_items?.length)
            );
          case 3:
            if (bookingData.service_type === 'blade_transfer') {
              return !!(bookingData.blade_flight_date);
            }
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
          // If a payment is in flight, the customer has already been charged and
          // a booking still needs to be created. Wiping bookingData here (the old
          // behavior) made the recovery POST send an empty body → 400 → the PI was
          // deleted and the payment orphaned. Preserve the booking data alongside
          // the pending PI so recovery can complete (INC-004). Backend
          // auto-recovery is the ultimate safety net, but keeping the client able
          // to finish is strictly better.
          const hasPendingPayment = !!persistedState?.pendingPaymentIntentId;
          return {
            currentStep: hasPendingPayment ? (persistedState?.currentStep ?? 0) : 0,
            isLoading: false,
            bookingData: hasPendingPayment && persistedState?.bookingData
              ? { ...initialBookingData, ...persistedState.bookingData }
              : { ...initialBookingData },
            errors: {},
            isBookingComplete: false,
            completedBookingNumber: undefined,
            userId: hasPendingPayment ? (persistedState?.userId ?? 'guest') : 'guest',
            isGuestMode: hasPendingPayment ? (persistedState?.isGuestMode ?? true) : true,
            lastResetTimestamp: Date.now(),
            // Preserve pending PI across version migrations to avoid orphaning
            // in-flight payments during a deploy
            pendingPaymentIntentId: persistedState?.pendingPaymentIntentId,
            pendingBookingToken: persistedState?.pendingBookingToken,
            cartKey: persistedState?.cartKey,
            paymentConfirmInFlight: persistedState?.paymentConfirmInFlight,
          };
        }
        
        if (persistedState?.lastResetTimestamp) {
          const age = Date.now() - persistedState.lastResetTimestamp;
          if (age > MAX_SESSION_AGE_MS) {
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
        bookingData: {
          ...state.bookingData,
          // Persist customer_info only during an active payment flow (3D Secure
          // redirect needs it after full page reload). Cleared when the PI is
          // cleared on booking completion or wizard reset.
          customer_info: state.pendingPaymentIntentId
            ? state.bookingData.customer_info
            : undefined,
        },
        currentStep: state.currentStep,
        isBookingComplete: state.isBookingComplete,
        completedBookingNumber: state.completedBookingNumber,
        userId: state.userId,
        isGuestMode: state.isGuestMode,
        lastResetTimestamp: state.lastResetTimestamp,
        pendingPaymentIntentId: state.pendingPaymentIntentId,
        pendingBookingToken: state.pendingBookingToken,
        cartKey: state.cartKey,
        paymentConfirmInFlight: state.paymentConfirmInFlight,
      })
    }
  )
);