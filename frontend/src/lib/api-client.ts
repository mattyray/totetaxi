// src/lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000 // Add timeout for mobile networks
});

// Enhanced request interceptor with mobile debugging
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      console.log('🔄 Fetching CSRF token for:', config.method, config.url);
      
      const csrfResponse = await axios.get(`${config.baseURL}/api/customer/csrf-token/`, {
        withCredentials: true,
        timeout: 5000
      });
      
      const token = csrfResponse.data.csrf_token;
      console.log('🔑 CSRF token received:', token ? `${token.substring(0, 8)}...` : 'NONE');
      console.log('🍪 Cookies in CSRF response:', document.cookie);
      
      if (token) {
        config.headers['X-CSRFToken'] = token;
        console.log('✅ CSRF token added to request headers');
      } else {
        console.error('❌ No CSRF token in response:', csrfResponse.data);
      }
    } catch (error: any) {
      console.error('❌ CSRF token fetch failed:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
    }
  }
  
  console.log('📤 Final request headers:', {
    'X-CSRFToken': config.headers['X-CSRFToken'] ? 'SET' : 'MISSING',
    'Content-Type': config.headers['Content-Type'],
    cookies: document.cookie ? 'PRESENT' : 'MISSING'
  });
  
  return config;
});

// Enhanced response interceptor with proper auth handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.log('🔓 401 Unauthorized - clearing auth state');
      
      try {
        const { useAuthStore } = await import('@/stores/auth-store');
        const { useStaffAuthStore } = await import('@/stores/staff-auth-store');
        
        useAuthStore.getState().clearAuth();
        useStaffAuthStore.getState().clearAuth();
        
        console.log('🧹 Auth stores cleared due to 401');
        
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
            console.log('🔄 401 detected - components will handle redirect');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error clearing auth on 401:', e);
      }
    }

    if (error.response?.status === 403) {
      console.error('🚫 403 Forbidden - CSRF or permission issue');
    }

    return Promise.reject(error);
  }
);