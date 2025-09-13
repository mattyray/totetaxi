'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { BookingManagement } from '@/components/staff/booking-management';

export default function StaffBookingsPage() {
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
    <div className="min-h-screen bg-cream-50">
      <div className="container mx-auto px-4 py-8">
        <BookingManagement />
      </div>
    </div>
  );
}