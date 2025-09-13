import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useStaffAuthStore = create<StaffAuthState & StaffAuthActions>()(
  persist(
    (set) => ({
      // State
      user: null,
      staffProfile: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setAuth: (user, profile) => set({
        user,
        staffProfile: profile,
        isAuthenticated: true,
        isLoading: false
      }),

      clearAuth: () => set({
        user: null,
        staffProfile: null,
        isAuthenticated: false,
        isLoading: false
      }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'totetaxi-staff-auth',
      partialize: (state) => ({
        user: state.user,
        staffProfile: state.staffProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);