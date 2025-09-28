// src/lib/api-client.ts - FIXED VERSION
import axios from 'axios';

// Get session cookie value for manual header
function getSessionId() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sessionid') {
      return value;
    }
  }
  return null;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Enhanced request interceptor with mobile session fix
apiClient.interceptors.request.use(async (config) => {
  // MOBILE FIX: Manually add session cookie to headers
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers['Cookie'] = `sessionid=${sessionId}`;
    console.log('📱 Mobile: Added session cookie to headers');
  }

  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      const csrfResponse = await axios.get(`${config.baseURL}/api/customer/csrf-token/`, {
        withCredentials: true,
        headers: sessionId ? { 'Cookie': `sessionid=${sessionId}` } : {},
        timeout: 5000
      });
      
      const token = csrfResponse.data.csrf_token;
      if (token) {
        config.headers['X-CSRFToken'] = token;
      }
    } catch (error) {
      console.error('CSRF token fetch failed:', error);
    }
  }
  
  return config;
});

// Response interceptor stays the same
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - clearing auth state');
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