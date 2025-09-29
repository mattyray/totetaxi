import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DjangoUser, CustomerProfile } from '@/types';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user: DjangoUser, profile: CustomerProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: DjangoUser; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; user?: DjangoUser; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearSessionIfIncognito: () => void;
  secureReset: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

const initialState: AuthState = {
  user: null,
  customerProfile: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setAuth: (user, profile) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('totetaxi-last-activity', Date.now().toString());
        }
        set({
          user,
          customerProfile: profile,
          isAuthenticated: true,
          isLoading: false
        });
      },

      clearAuth: () => {
        console.log('Clearing customer auth state');
        
        if (typeof window !== 'undefined') {
          const keysToRemove = [
            'totetaxi-auth',
            'totetaxi-last-activity',
            'totetaxi-booking-wizard',
            'totetaxi-session-id',
            'totetaxi-csrf-token'
          ];
          
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
              console.log(`Cleared ${key}`);
            } catch (e) {
              console.warn(`Failed to remove ${key}:`, e);
            }
          });
        }
        
        queryClient.clear();
        console.log('Cleared React Query cache');
        
        set(initialState);
      },

      setLoading: (loading) => set({ isLoading: loading }),

      updateProfile: (updates) => set((state) => ({
        customerProfile: state.customerProfile 
          ? { ...state.customerProfile, ...updates }
          : null
      })),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.post('/api/customer/auth/login/', {
            email,
            password
          });

          if (response.status === 200) {
            const { user, customer_profile, session_id, csrf_token } = response.data;
            
            // Store session ID and CSRF token for mobile fallback
            if (session_id) {
              localStorage.setItem('totetaxi-session-id', session_id);
              console.log('Stored session ID for mobile compatibility');
            }
            if (csrf_token) {
              localStorage.setItem('totetaxi-csrf-token', csrf_token);
            }
            
            get().setAuth(user, customer_profile);
            return { success: true, user };
          } else {
            set({ isLoading: false });
            return { success: false, error: 'Login failed' };
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || 'Network error. Please try again.';
          return { success: false, error: errorMessage };
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.post('/api/customer/auth/register/', {
            ...data,
            password_confirm: data.password
          });

          if (response.status === 201) {
            set({ isLoading: false });
            return { success: true, user: response.data.user };
          } else {
            set({ isLoading: false });
            return { success: false, error: 'Registration failed' };
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || 'Network error. Please try again.';
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        console.log('Customer logout initiated');
        
        try {
          await apiClient.post('/api/customer/auth/logout/');
          console.log('Customer logout API call successful');
        } catch (error) {
          console.warn('Customer logout API failed:', error);
        }
        
        get().clearAuth();
        
        try {
          const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
          useStaffAuthStore.getState().clearAuth();
          console.log('Staff auth cleared during customer logout');
        } catch (e) {
          console.warn('Could not clear staff auth:', e);
        }
        
        if (typeof window !== 'undefined') {
          try {
            const { useBookingWizard } = await import('@/stores/booking-store');
            useBookingWizard.getState().resetWizard();
            console.log('Booking wizard cleared');
          } catch (e) {
            console.warn('Could not clear booking wizard:', e);
          }
        }
      },

      validateSession: async () => {
        const { user, isAuthenticated } = get();
        
        if (!isAuthenticated || !user) {
          return false;
        }
        
        try {
          const response = await apiClient.get('/api/customer/profile/');
          
          if (response.status === 200) {
            const { customer_profile } = response.data;
            if (customer_profile) {
              set({ customerProfile: customer_profile });
            }
            return true;
          }
          
          return false;
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.log('Session validation failed - clearing auth');
            get().clearAuth();
          }
          return false;
        }
      },

      clearSessionIfIncognito: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('totetaxi-last-activity', Date.now().toString());
        }
      },

      secureReset: () => {
        console.log('SECURITY: Performing secure reset of customer auth');
        
        if (typeof window !== 'undefined') {
          try {
            const allKeys = Object.keys(localStorage);
            allKeys
              .filter(key => key.startsWith('totetaxi-'))
              .forEach(key => {
                localStorage.removeItem(key);
                console.log(`SECURITY: Cleared ${key}`);
              });
          } catch (e) {
            console.warn('Could not perform secure localStorage clear:', e);
          }
        }
        
        queryClient.clear();
        console.log('SECURITY: Cleared React Query cache');
        
        set(initialState);
      }
    }),
    {
      name: 'totetaxi-auth',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        console.log(`Customer auth migrating from version ${version} to 2`);
        
        if (version < 2) {
          console.log('Customer auth reset due to version upgrade');
          return initialState;
        }
        
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        customerProfile: state.customerProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);