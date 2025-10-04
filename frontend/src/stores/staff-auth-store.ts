// frontend/src/stores/staff-auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

interface StaffUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface StaffProfile {
  id: string;
  role: 'staff' | 'admin';
  department: string;
  full_name: string;
  permissions: {
    can_approve_refunds: boolean;
    can_manage_staff: boolean;
    can_view_financial_reports: boolean;
  };
}

interface StaffAuthState {
  user: StaffUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface StaffAuthActions {
  setAuth: (user: StaffUser, profile: StaffProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; user?: StaffUser; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  secureReset: () => void;
}

const initialState: StaffAuthState = {
  user: null,
  staffProfile: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useStaffAuthStore = create<StaffAuthState & StaffAuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (user, profile) => {
        set({
          user,
          staffProfile: profile,
          isAuthenticated: true,
          isLoading: false
        });
      },

      clearAuth: () => {
        console.log('Clearing staff auth state');
        
        if (typeof window !== 'undefined') {
          const keysToRemove = [
            'totetaxi-staff-auth',
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

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.post('/api/staff/auth/login/', {
            username,
            password
          });

          if (response.status === 200) {
            const { user, staff_profile, session_id, csrf_token } = response.data;
            
            // Store session ID and CSRF token for mobile compatibility
            if (session_id) {
              localStorage.setItem('totetaxi-session-id', session_id);
              console.log('Stored session ID for mobile compatibility');
            }
            if (csrf_token) {
              localStorage.setItem('totetaxi-csrf-token', csrf_token);
              console.log('Stored CSRF token for mobile compatibility');
            }
            
            get().setAuth(user, staff_profile);
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

      logout: async () => {
        console.log('Staff logout initiated');
        
        try {
          await apiClient.post('/api/staff/auth/logout/');
          console.log('Staff logout API call successful');
        } catch (error) {
          console.warn('Staff logout API failed:', error);
        }
        
        get().clearAuth();
        
        try {
          const { useAuthStore } = await import('@/stores/auth-store');
          useAuthStore.getState().clearAuth();
          console.log('Customer auth cleared during staff logout');
        } catch (e) {
          console.warn('Could not clear customer auth:', e);
        }
      },

      validateSession: async () => {
        const { user, isAuthenticated } = get();
        
        if (!isAuthenticated || !user) {
          return false;
        }
        
        try {
          const response = await apiClient.get('/api/staff/dashboard/');
          
          if (response.status === 200) {
            return true;
          }
          
          return false;
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.log('Staff session validation failed - clearing auth');
            get().clearAuth();
          }
          return false;
        }
      },

      secureReset: () => {
        console.log('SECURITY: Performing secure reset of staff auth');
        
        if (typeof window !== 'undefined') {
          try {
            const allKeys = Object.keys(localStorage);
            allKeys
              .filter(key => key.startsWith('totetaxi-staff') || key.startsWith('totetaxi-session') || key.startsWith('totetaxi-csrf'))
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
      name: 'totetaxi-staff-auth',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        console.log(`Staff auth migrating from version ${version} to 2`);
        
        if (version < 2) {
          console.log('Staff auth reset due to version upgrade');
          return initialState;
        }
        
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        staffProfile: state.staffProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);