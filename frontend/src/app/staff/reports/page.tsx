// frontend/src/app/staff/customers/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { Card, CardContent } from '@/components/ui/card';

export default function StaffReportsPage() {
  const { isAuthenticated, isLoading } = useStaffAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-serif font-bold text-navy-900">
          Reports & Analytics
        </h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-navy-600">
              Business reports and analytics will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}