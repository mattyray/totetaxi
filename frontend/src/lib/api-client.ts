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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Auth error detected');
    }
    return Promise.reject(error);
  }
);