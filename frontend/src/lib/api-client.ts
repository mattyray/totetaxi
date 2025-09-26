// frontend/src/lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for CSRF token - use customer endpoint for all requests
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      // FIXED: Use customer CSRF endpoint for all requests (staff endpoint doesn't exist)
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

// Enhanced response interceptor with proper auth handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - clearing auth state');
      
      // Clear auth stores (imported dynamically to avoid circular deps)
      try {
        const { useAuthStore } = await import('@/stores/auth-store');
        const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
        
        useAuthStore.getState().clearAuth();
        useStaffAuthStore.getState().clearAuth();
        
        console.log('Auth stores cleared due to 401');
        
        // Let components handle redirects - don't use router here
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
            console.log('401 detected - components will handle redirect');
          }
        }
      } catch (e) {
        console.warn('Error clearing auth on 401:', e);
      }
    }
    return Promise.reject(error);
  }
);