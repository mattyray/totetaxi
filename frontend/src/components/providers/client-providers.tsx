// frontend/src/components/providers/client-providers.tsx
'use client';

import { QueryProvider } from "@/components/providers/query-provider";
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useStaffAuthStore } from '@/stores/staff-auth-store';

// Component to handle session validation
function SessionValidator() {
  const { validateSession: validateCustomer } = useAuthStore();
  const { validateSession: validateStaff } = useStaffAuthStore();

  useEffect(() => {
    const validateSessions = async () => {
      console.log('Validating stored sessions on app startup');

      // Read auth state at call time (not from stale closure)
      const isCustomerAuth = useAuthStore.getState().isAuthenticated;
      const isStaffAuth = useStaffAuthStore.getState().isAuthenticated;

      try {
        if (isCustomerAuth) {
          const isValid = await validateCustomer();
          if (!isValid) {
            console.log('Customer session invalid - cleared automatically');
          }
        }

        if (isStaffAuth) {
          const isValid = await validateStaff();
          if (!isValid) {
            console.log('Staff session invalid - cleared automatically');
          }
        }
      } catch (error) {
        console.warn('Session validation error:', error);
      }
    };

    // Run validation once on mount only
    const timer = setTimeout(validateSessions, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // This component doesn't render anything
}

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <QueryProvider>
      <SessionValidator />
      {children}
    </QueryProvider>
  );
}