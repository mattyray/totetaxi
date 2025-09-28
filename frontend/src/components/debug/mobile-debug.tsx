// src/components/debug/mobile-debug.tsx
'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useState } from 'react';

export function MobileDebug() {
  const { isAuthenticated, user } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const getAllLocalStorage = () => {
      const items: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key);
        }
      }
      return items;
    };

    const info = {
      timestamp: new Date().toISOString(),
      authentication: {
        isAuthenticated,
        userEmail: user?.email || 'none',
        userId: user?.id || 'none',
      },
      browser: {
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        cookieEnabled: navigator.cookieEnabled,
      },
      storage: {
        localStorage: getAllLocalStorage(),
        sessionStorage: sessionStorage.length,
        cookies: document.cookie,
      },
      page: {
        url: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
      },
      network: {
        online: navigator.onLine,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
      }
    };
    
    setDebugInfo(info);
    console.log('Mobile Debug Info:', info);
  }, [isAuthenticated, user]);

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-100 border-b-2 border-red-300 p-2 text-xs z-50 max-h-64 overflow-y-auto">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-red-800">Mobile Debug Info</h3>
        <button 
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
            alert('Debug info copied to clipboard');
          }}
          className="bg-red-200 px-2 py-1 rounded text-red-800"
        >
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-red-900 bg-white p-2 rounded">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}