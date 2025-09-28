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
      authentication: {
        isAuthenticated,
        userEmail: user?.email || 'NONE',
        userId: user?.id || 'NONE',
      },
      browser: {
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        cookieEnabled: navigator.cookieEnabled,
      },
      storage: {
        localStorageItems: getAllLocalStorage(),
        cookies: document.cookie,
      },
      url: window.location.href,
    };
    
    setDebugInfo(info);
  }, [isAuthenticated, user]);

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 p-4 text-xs z-50 max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2">MOBILE DEBUG</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}