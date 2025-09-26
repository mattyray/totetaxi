// frontend/src/app/layout.tsx
'use client';

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useStaffAuthStore } from '@/stores/staff-auth-store';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        <QueryProvider>
          <SessionValidator />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}