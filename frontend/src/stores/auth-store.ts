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
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      customerProfile: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setAuth: (user, profile) => set({
        user,
        customerProfile: profile,
        isAuthenticated: true,
        isLoading: false
      }),

      clearAuth: () => set({
        user: null,
        customerProfile: null,
        isAuthenticated: false,
        isLoading: false
      }),

      setLoading: (loading) => set({ isLoading: loading }),

      updateProfile: (updates) => set((state) => ({
        customerProfile: state.customerProfile 
          ? { ...state.customerProfile, ...updates }
          : null
      }))
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