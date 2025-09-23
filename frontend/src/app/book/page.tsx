'use client';
// frontend/src/app/book/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookingWizard } from '@/components/booking';
import { MainLayout } from '@/components/layout/main-layout';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/stores/auth-store';

export default function BookPage() {
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setShowBookingWizard(true);
  }, []);

  const closeBookingWizard = () => {
    setShowBookingWizard(false);
    // Redirect authenticated users to dashboard, guests to home
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            Book Your Luxury Move
          </h1>
          <p className="text-navy-700">Loading booking wizard...</p>
        </div>
      </div>

      <Modal
        isOpen={showBookingWizard}
        onClose={closeBookingWizard}
        size="xl"
        showCloseButton={true}
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-br from-cream-50 to-cream-100 min-h-full">
          <BookingWizard onComplete={closeBookingWizard} />
        </div>
      </Modal>
    </MainLayout>
  );
}