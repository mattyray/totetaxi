import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// Request interceptor - handle CSRF tokens
apiClient.interceptors.request.use(async (config) => {
  // Handle CSRF token for mutations
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    const csrfToken = localStorage.getItem('totetaxi-csrf-token');
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    } else {
      // Determine if this is a staff or customer endpoint
      const isStaffEndpoint = config.url?.includes('/api/staff/');
      const csrfEndpoint = isStaffEndpoint 
        ? '/api/staff/csrf-token/' 
        : '/api/customer/csrf-token/';
      
      // Try to fetch CSRF token from correct endpoint
      try {
        const csrfResponse = await axios.get(
          `${config.baseURL}${csrfEndpoint}`,
          { 
            withCredentials: true,
            timeout: 5000
          }
        );
        
        const token = csrfResponse.data.csrf_token;
        if (token) {
          localStorage.setItem('totetaxi-csrf-token', token);
          config.headers['X-CSRFToken'] = token;
        }
      } catch (error) {
        console.error('CSRF token fetch failed:', error);
      }
    }
  }
  
  return config;
});

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - clearing auth state');
      
      // Clear stored session data
      localStorage.removeItem('totetaxi-csrf-token');
      
      // Clear auth stores
      try {
        const { useAuthStore } = await import('@/stores/auth-store');
        const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
        
        useAuthStore.getState().clearAuth();
        useStaffAuthStore.getState().clearAuth();
      } catch (e) {
        console.warn('Error clearing auth on 401:', e);
      }
    }
    
    return Promise.reject(error);
  }
);