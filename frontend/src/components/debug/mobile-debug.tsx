// Update src/components/debug/mobile-debug.tsx
'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function MobileDebug() {
  const { isAuthenticated, user } = useAuthStore();
  const [apiTests, setApiTests] = useState<any>({});

  useEffect(() => {
    const testAPIs = async () => {
      const tests: any = {
        auth: { isAuthenticated, userEmail: user?.email || 'NONE' }
      };

      // Test dashboard API
      try {
        const dashResponse = await apiClient.get('/api/customer/dashboard/');
        tests.dashboardAPI = { success: true, status: dashResponse.status };
      } catch (err: any) {
        tests.dashboardAPI = { success: false, error: err.message, status: err.response?.status };
      }

      // Test bookings API  
      try {
        const bookingsResponse = await apiClient.get('/api/customer/bookings/');
        tests.bookingsAPI = { success: true, status: bookingsResponse.status };
      } catch (err: any) {
        tests.bookingsAPI = { success: false, error: err.message, status: err.response?.status };
      }

      setApiTests(tests);
    };

    if (isAuthenticated) {
      testAPIs();
    }
  }, [isAuthenticated, user]);

  return (
    <div className="fixed top-0 left-0 right-0 bg-black text-white p-4 text-xs z-50 max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2 text-red-400">MOBILE API DEBUG</h3>
      <pre className="whitespace-pre-wrap text-green-300">
        {JSON.stringify(apiTests, null, 2)}
      </pre>
    </div>
  );
}