// src/app/page.tsx
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { BookingWizard } from '@/components/booking';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  HeroSection,
  HowItWorksSection,
  WhatWeTransportSection,
  ServiceAreasSection,
  TestimonialsSection
} from '@/components/marketing';
import { ServiceShowcase } from '@/components/marketing/service-showcase';

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
      <MainLayout onBookNowClick={openBookingWizard}>
        <HeroSection onBookNowClick={openBookingWizard} />
        <HowItWorksSection />
        <WhatWeTransportSection />
        <ServiceShowcase />
        <ServiceAreasSection />
        <TestimonialsSection />
        
        {/* Partnerships */}
        <section className="py-16 bg-cream-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
                Trusted Partners
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="font-medium text-navy-900 mb-2">BLADE</h3>
                <p className="text-navy-600 text-sm">Official luggage delivery partner for helicopter transfers</p>
              </div>
              <div className="text-center">
                <h3 className="font-medium text-navy-900 mb-2">Cultured Magazine</h3>
                <p className="text-navy-600 text-sm">Trusted delivery partner</p>
              </div>
              <div className="text-center">
                <h3 className="font-medium text-navy-900 mb-2">Luggage Free</h3>
                <p className="text-navy-600 text-sm">Partner in luggage logistics</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-navy-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Ready to Travel Hands-Free?
            </h2>
            <p className="text-xl text-navy-200 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust Tote Taxi for stress-free delivery service.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={openBookingWizard}
            >
              Book Now
            </Button>
          </div>
        </section>
      </MainLayout>

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