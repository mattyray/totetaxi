// frontend/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    }
  }
});

// ✅ CORRECT v5 APPROACH: Global error handling using QueryClient events
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'observerResultsUpdated') {
    const result = event.query.state;
    if (result.error?.response?.status === 401) {
      handle401Error();
    }
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event?.type === 'updated') {
    const result = event.mutation.state;
    if (result.error?.response?.status === 401) {
      handle401Error();
    }
  }
});

// ✅ CENTRALIZED: 401 error handler
async function handle401Error() {
  console.log('🚨 React Query detected 401 - clearing cache');
  
  try {
    // Clear the query cache
    queryClient.clear();
    console.log('✅ React Query cache cleared');
    
    // Clear auth stores
    const { useAuthStore } = await import('@/stores/auth-store');
    const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
    
    useAuthStore.getState().clearAuth();
    useStaffAuthStore.getState().clearAuth();
    
  } catch (e) {
    console.warn('Error handling React Query 401:', e);
  }
}