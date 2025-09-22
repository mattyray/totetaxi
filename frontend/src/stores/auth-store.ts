// frontend/src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DjangoUser, CustomerProfile } from '@/types';

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
  clearSessionIfIncognito: () => void;
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

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-domain.com'
  : 'http://localhost:8005';

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
        // CRITICAL FIX: Clear ALL auth-related localStorage keys
        if (typeof window !== 'undefined') {
          const keysToRemove = [
            'totetaxi-auth',
            'totetaxi-last-activity',
            'totetaxi-booking-wizard'
          ];
          
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
              console.log(`✓ Cleared ${key}`);
            } catch (e) {
              console.warn(`Failed to remove ${key}:`, e);
            }
          });
        }
        
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
          // Get CSRF token first
          const csrfResponse = await fetch(`${API_BASE}/api/customer/csrf-token/`, {
            credentials: 'include',
          });
          
          if (!csrfResponse.ok) {
            throw new Error('Failed to get CSRF token');
          }
          
          const { csrf_token } = await csrfResponse.json();

          // Login request
          const response = await fetch(`${API_BASE}/api/customer/auth/login/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrf_token,
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (response.ok) {
            get().setAuth(data.user, data.customer_profile);
            return { success: true, user: data.user };
          } else {
            set({ isLoading: false });
            return { success: false, error: data.error || 'Login failed' };
          }
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        
        try {
          // Get CSRF token first
          const csrfResponse = await fetch(`${API_BASE}/api/customer/csrf-token/`, {
            credentials: 'include',
          });
          
          if (!csrfResponse.ok) {
            throw new Error('Failed to get CSRF token');
          }
          
          const { csrf_token } = await csrfResponse.json();

          // Registration request
          const response = await fetch(`${API_BASE}/api/customer/auth/register/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrf_token,
            },
            credentials: 'include',
            body: JSON.stringify({
              ...data,
              password_confirm: data.password
            }),
          });

          const responseData = await response.json();

          if (response.ok) {
            set({ isLoading: false });
            return { success: true, user: responseData.user };
          } else {
            set({ isLoading: false });
            return { success: false, error: responseData.error || 'Registration failed' };
          }
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      logout: async () => {
        try {
          await fetch(`${API_BASE}/api/customer/auth/logout/`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.warn('Logout request failed:', error);
        } finally {
          get().clearAuth();
          
          // CRITICAL FIX: Also clear booking wizard via dynamic import to avoid circular dependency
          if (typeof window !== 'undefined') {
            try {
              const { useBookingWizard } = await import('@/stores/booking-store');
              useBookingWizard.getState().resetWizard();
            } catch (e) {
              console.warn('Could not clear booking wizard:', e);
            }
          }
        }
      },

      clearSessionIfIncognito: () => {
        if (typeof window !== 'undefined') {
          const now = Date.now();
          const lastActivity = localStorage.getItem('totetaxi-last-activity');
          
          // FIXED: 24 hours instead of 30 minutes
          if (!lastActivity || (now - parseInt(lastActivity)) > 24 * 60 * 60 * 1000) {
            console.log('Session expired (24h inactivity), clearing auth');
            localStorage.clear();
            set(initialState);
          } else {
            localStorage.setItem('totetaxi-last-activity', now.toString());
          }
        }
      }
    }),
    {
      name: 'totetaxi-auth',
      partialize: (state) => ({
        user: state.user,
        customerProfile: state.customerProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);