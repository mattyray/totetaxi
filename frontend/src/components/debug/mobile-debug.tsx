// src/components/debug/mobile-debug.tsx
'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import axios from 'axios';

export function MobileDebug() {
  const { isAuthenticated, user } = useAuthStore();
  const [apiTests, setApiTests] = useState<any>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const copyToClipboard = async () => {
    try {
      const debugText = JSON.stringify(apiTests, null, 2);
      await navigator.clipboard.writeText(debugText);
      setCopyStatus('COPIED!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(apiTests, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyStatus('COPIED!');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  useEffect(() => {
    const testAPIs = async () => {
      const tests: any = {
        auth: { 
          isAuthenticated, 
          userEmail: user?.email || 'NONE',
          timestamp: new Date().toISOString()
        }
      };

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';

      // Test 1: Direct CSRF token fetch
      try {
        console.log('Testing CSRF token fetch...');
        const csrfResponse = await axios.get(`${baseURL}/api/customer/csrf-token/`, {
          withCredentials: true,
          timeout: 5000
        });
        
        tests.csrfDirect = { 
          success: true, 
          token: csrfResponse.data.csrf_token ? `${csrfResponse.data.csrf_token.substring(0, 10)}...` : 'NONE',
          cookies: document.cookie.length > 0 ? `${document.cookie.length} chars` : 'NONE',
          status: csrfResponse.status
        };
      } catch (err: any) {
        tests.csrfDirect = { 
          success: false, 
          error: err.message, 
          status: err.response?.status,
          config: err.config?.url
        };
      }

      // Test 2: Dashboard API (GET request)
      try {
        console.log('Testing dashboard API...');
        const dashResponse = await apiClient.get('/api/customer/dashboard/');
        tests.dashboardAPI = { 
          success: true, 
          status: dashResponse.status,
          dataKeys: Object.keys(dashResponse.data || {})
        };
      } catch (err: any) {
        tests.dashboardAPI = { 
          success: false, 
          error: err.message, 
          status: err.response?.status,
          responseData: err.response?.data
        };
      }

      // Test 3: Bookings API (GET request)
      try {
        console.log('Testing bookings API...');
        const bookingsResponse = await apiClient.get('/api/customer/bookings/');
        tests.bookingsAPI = { 
          success: true, 
          status: bookingsResponse.status,
          count: Array.isArray(bookingsResponse.data) ? bookingsResponse.data.length : 'not-array'
        };
      } catch (err: any) {
        tests.bookingsAPI = { 
          success: false, 
          error: err.message, 
          status: err.response?.status,
          responseData: err.response?.data
        };
      }

      // Test 4: Browser environment
      tests.browser = {
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        currentCookies: document.cookie ? 'PRESENT' : 'NONE',
        localStorage: localStorage.getItem('auth-storage') ? 'PRESENT' : 'NONE'
      };

      console.log('Mobile Debug Results:', tests);
      setApiTests(tests);
    };

    if (isAuthenticated) {
      testAPIs();
    } else {
      setApiTests({ auth: { isAuthenticated: false, message: 'Not authenticated' } });
    }
  }, [isAuthenticated, user]);

  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded z-50 shadow-lg"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-3 text-xs z-50 max-h-80 overflow-y-auto border-t-4 border-red-500">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-red-400">MOBILE API DEBUG</h3>
        <div className="flex gap-1">
          <button 
            onClick={copyToClipboard}
            className="text-white bg-green-600 px-2 py-1 rounded text-xs"
          >
            {copyStatus || 'COPY'}
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="text-white bg-blue-600 px-2 py-1 rounded text-xs"
          >
            RELOAD
          </button>
          <button 
            onClick={() => setIsMinimized(true)}
            className="text-white bg-red-600 px-2 py-1 rounded text-xs"
          >
            MIN
          </button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-green-300 text-xs">
        {JSON.stringify(apiTests, null, 2)}
      </pre>
    </div>
  );
}