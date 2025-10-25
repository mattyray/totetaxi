// frontend/src/components/providers/client-providers.tsx
'use client';

import { QueryProvider } from "@/components/providers/query-provider";
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useStaffAuthStore } from '@/stores/staff-auth-store';

// Component to handle session validation
function SessionValidator() {
  const { isAuthenticated: customerAuth, validateSession: validateCustomer } = useAuthStore();
  const { isAuthenticated: staffAuth, validateSession: validateStaff } = useStaffAuthStore();

  useEffect(() => {
    const validateSessions = async () => {
      console.log('Validating stored sessions on app startup');
      
      try {
        if (customerAuth) {
          const isValid = await validateCustomer();
          if (!isValid) {
            console.log('Customer session invalid - cleared automatically');
          }
        }
        
        if (staffAuth) {
          const isValid = await validateStaff();
          if (!isValid) {
            console.log('Staff session invalid - cleared automatically');
          }
        }
      } catch (error) {
        console.warn('Session validation error:', error);
      }
    };

    // Run validation after a brief delay to ensure stores are initialized
    const timer = setTimeout(validateSessions, 1000);
    return () => clearTimeout(timer);
  }, [customerAuth, staffAuth, validateCustomer, validateStaff]);

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