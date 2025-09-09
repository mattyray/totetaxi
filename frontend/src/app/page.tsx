'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ServiceShowcase } from '@/components/marketing/service-showcase';
import { TestAPIConnection } from '@/components/test-api-connection';
import { BookingWizard } from '@/components/booking';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export default function Home() {
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  const openBookingWizard = () => {
    setShowBookingWizard(true);
  };

  const closeBookingWizard = () => {
    setShowBookingWizard(false);
  };

  return (
    <>
      <MainLayout>
        {/* Hero Section */}
        <section className="py-24 bg-gradient-to-br from-cream-50 to-cream-100">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy-900 mb-6">
              Luxury Delivery to the Hamptons
            </h1>
            <p className="text-xl text-navy-700 mb-8 max-w-3xl mx-auto">
              From suitcases to surfboards, strollers to pop-up props, ToteTaxi makes seasonal relocation effortless, polished, and convenient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" onClick={openBookingWizard}>
                Book Your Move
              </Button>
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </div>
          </div>
        </section>

        {/* API Connection Status - Remove this in production */}
        <div className="container mx-auto px-4 py-8">
          <TestAPIConnection />
        </div>

        {/* Service Showcase */}
        <ServiceShowcase />

        {/* Trust Signals Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
                Trusted by Premium Brands
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🚁</div>
                <h3 className="font-medium text-navy-900 mb-2">Blade Integration</h3>
                <p className="text-navy-600 text-sm">Official luggage partner for helicopter transfers</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="font-medium text-navy-900 mb-2">Cultured Magazine</h3>
                <p className="text-navy-600 text-sm">Trusted distribution partner</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏃‍♀️</div>
                <h3 className="font-medium text-navy-900 mb-2">Tracy Anderson</h3>
                <p className="text-navy-600 text-sm">Pop-up equipment delivery</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="py-16 bg-navy-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Ready for White-Glove Service?
            </h2>
            <p className="text-xl text-navy-200 mb-8 max-w-2xl mx-auto">
              Join hundreds of satisfied customers who trust ToteTaxi for their Hamptons moves.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={openBookingWizard}
            >
              Start Your Booking
            </Button>
          </div>
        </section>
      </MainLayout>

      {/* Booking Wizard Modal */}
      <Modal
        isOpen={showBookingWizard}
        onClose={closeBookingWizard}
        size="full"
        className="max-w-6xl"
        showCloseButton={true}
      >
        <BookingWizard />
      </Modal>
    </>
  );
}