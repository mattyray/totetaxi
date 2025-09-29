// src/components/debug/mobile-debug.tsx - MAKE SURE TO USE THIS VERSION
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

      // DETAILED COOKIE ANALYSIS
      const allCookies = document.cookie;
      const cookieMap: any = {};
      if (allCookies) {
        allCookies.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          cookieMap[name] = value;
        });
      }

      tests.cookieDetails = {
        raw: allCookies,
        parsed: cookieMap,
        sessionid: cookieMap.sessionid || 'MISSING',
        csrftoken: cookieMap.csrftoken || 'MISSING',
        totetaxi_sessionid: cookieMap.totetaxi_sessionid || 'MISSING',
        count: Object.keys(cookieMap).length
      };

      // TEST 1: Call our custom debug endpoint
      try {
        const debugResponse = await axios.get(`${baseURL}/api/customer/debug/`, {
          withCredentials: true,
          timeout: 5000
        });
        
        tests.debugEndpoint = {
          status: debugResponse.status,
          headers: {
            'set-cookie': debugResponse.headers['set-cookie'] || 'NONE',
            'access-control-allow-credentials': debugResponse.headers['access-control-allow-credentials'] || 'NONE',
            'access-control-allow-origin': debugResponse.headers['access-control-allow-origin'] || 'NONE',
          },
          data: debugResponse.data,
          cookiesAfter: document.cookie
        };
      } catch (err: any) {
        tests.debugEndpoint = { 
          error: err.message, 
          status: err.response?.status,
          responseHeaders: err.response?.headers || 'NONE'
        };
      }

      // TEST 2: Dashboard API after debug endpoint
      try {
        const dashResponse = await apiClient.get('/api/customer/dashboard/');
        tests.dashboardAPI = { 
          success: true, 
          status: dashResponse.status
        };
      } catch (err: any) {
        tests.dashboardAPI = { 
          success: false, 
          error: err.message, 
          status: err.response?.status
        };
      }

      // TEST 3: Bookings API after debug endpoint
      try {
        const bookingsResponse = await apiClient.get('/api/customer/bookings/');
        tests.bookingsAPI = { 
          success: true, 
          status: bookingsResponse.status
        };
      } catch (err: any) {
        tests.bookingsAPI = { 
          success: false, 
          error: err.message, 
          status: err.response?.status
        };
      }

      // Environment details
      tests.environment = {
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent.substring(0, 80) + '...',
        baseURL: baseURL,
        cookiesEnabled: navigator.cookieEnabled
      };

      setApiTests(tests);
    };

    if (isAuthenticated) {
      testAPIs();
    } else {
      setApiTests({ auth: { isAuthenticated: false } });
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
        <h3 className="font-bold text-red-400">DEBUG ENDPOINT TEST</h3>
        <div className="flex gap-1">
          <button 
            onClick={copyToClipboard}
            className="text-white bg-green-600 px-2 py-1 rounded text-xs"
          >
            {copyStatus || 'COPY'}
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