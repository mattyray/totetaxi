'use client';

import { BookingWizard } from '@/components/booking';
import { MainLayout } from '@/components/layout/main-layout';

export default function BookPage() {
  // NO AUTH PROTECTION - this page works for both guest and authenticated users
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
        <BookingWizard />
      </div>
    </MainLayout>
  );
}