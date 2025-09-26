// frontend/src/lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for CSRF token
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      const csrfResponse = await axios.get(`${config.baseURL}/api/customer/csrf-token/`, {
        withCredentials: true
      });
      config.headers['X-CSRFToken'] = csrfResponse.data.csrf_token;
    } catch (error) {
      console.warn('Could not fetch CSRF token:', error);
    }
  }
  return config;
});

// ✅ ENHANCED: Response interceptor with proper auth handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('🚨 401 Unauthorized - clearing auth state');
      
      // Clear auth stores (imported dynamically to avoid circular deps)
      try {
        const { useAuthStore } = await import('@/stores/auth-store');
        const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
        
        useAuthStore.getState().clearAuth();
        useStaffAuthStore.getState().clearAuth();
        
        console.log('✅ Auth stores cleared due to 401');
        
        // Only redirect if we're not already on login pages
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
            // Use Next.js router if available, otherwise fallback
            try {
              const { useRouter } = await import('next/navigation');
              const router = useRouter();
              router.push('/login');
            } catch {
              // Fallback for cases where useRouter isn't available
              window.location.href = '/login';
            }
          }
        }
      } catch (e) {
        console.warn('Error clearing auth on 401:', e);
      }
    }
    return Promise.reject(error);
  }
);