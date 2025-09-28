// src/components/debug/mobile-debug.tsx - Enhanced cookie debugging
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
        count: Object.keys(cookieMap).length
      };

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';

      // Test with manual session header
      try {
        const sessionId = cookieMap.sessionid;
        const headers: any = {
          'Content-Type': 'application/json'
        };
        
        if (sessionId) {
          headers['Cookie'] = `sessionid=${sessionId}`;
        }

        const manualResponse = await axios.get(`${baseURL}/api/customer/dashboard/`, {
          withCredentials: true,
          headers,
          timeout: 5000
        });
        
        tests.manualSessionTest = { 
          success: true, 
          status: manualResponse.status,
          sessionUsed: sessionId ? 'YES' : 'NO'
        };
      } catch (err: any) {
        tests.manualSessionTest = { 
          success: false, 
          error: err.message, 
          status: err.response?.status,
          sessionUsed: cookieMap.sessionid ? 'YES' : 'NO'
        };
      }

      // Test dashboard API (normal way)
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

      // Environment details
      tests.environment = {
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent.substring(0, 60) + '...',
        baseURL: baseURL
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
        <h3 className="font-bold text-red-400">COOKIE DEBUG</h3>
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