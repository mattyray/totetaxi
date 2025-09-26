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
      // State
      ...initialState,

      // Actions
      setAuth: (user, profile) => {
        set({
          user,
          staffProfile: profile,
          isAuthenticated: true,
          isLoading: false
        });
      },

      // ✅ ENHANCED: Coordinated auth clearing
      clearAuth: () => {
        console.log('🧹 Clearing staff auth state');
        
        if (typeof window !== 'undefined') {
          const keysToRemove = [
            'totetaxi-staff-auth'
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
        
        // Clear React Query cache
        queryClient.clear();
        console.log('✓ Cleared React Query cache');
        
        set(initialState);
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // ✅ NEW: Staff login method using api-client
      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.post('/api/staff/auth/login/', {
            username,
            password
          });

          if (response.status === 200) {
            const { user, profile } = response.data;
            get().setAuth(user, profile);
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

      // ✅ NEW: Staff logout with coordination
      logout: async () => {
        console.log('🚪 Staff logout initiated');
        
        try {
          await apiClient.post('/api/staff/auth/logout/');
          console.log('✓ Staff logout API call successful');
        } catch (error) {
          console.warn('Staff logout API failed:', error);
        }
        
        // Always clear state, even if API call fails
        get().clearAuth();
        
        // Clear customer auth too (prevent hybrid states)
        try {
          const { useAuthStore } = await import('@/stores/auth-store');
          useAuthStore.getState().clearAuth();
          console.log('✓ Customer auth cleared during staff logout');
        } catch (e) {
          console.warn('Could not clear customer auth:', e);
        }
      },

      // ✅ NEW: Staff session validation
      validateSession: async () => {
        const { user, isAuthenticated } = get();
        
        if (!isAuthenticated || !user) {
          return false;
        }
        
        try {
          // Try to fetch staff dashboard to validate session
          const response = await apiClient.get('/api/staff/dashboard/');
          
          if (response.status === 200) {
            // Session is valid
            return true;
          }
          
          return false;
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.log('🚨 Staff session validation failed - clearing auth');
            get().clearAuth();
          }
          return false;
        }
      }
    }),
    {
      name: 'totetaxi-staff-auth',
      version: 1, // Add version for future migrations
      partialize: (state) => ({
        user: state.user,
        staffProfile: state.staffProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);