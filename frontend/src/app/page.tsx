// frontend/src/app/page.tsx - Updated version with better internal linking
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ServiceShowcase } from '@/components/marketing/service-showcase';
import { TestAPIConnection } from '@/components/test-api-connection';
import { BookingWizard } from '@/components/booking';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

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
              <Link href="/services">
                <Button variant="outline" size="lg">
                  View Services & Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* API Connection Status - Remove this in production */}
        <div className="container mx-auto px-4 py-8">
          <TestAPIConnection />
        </div>

        {/* Service Showcase */}
        <ServiceShowcase />

        {/* Value Propositions */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
                Why Choose ToteTaxi?
              </h2>
              <p className="text-lg text-navy-700 max-w-2xl mx-auto">
                We understand the unique needs of Manhattan-Hamptons seasonal living
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">⏰</div>
                    <h3 className="font-medium text-navy-900 mb-2">Precise Timing</h3>
                    <p className="text-navy-600 text-sm">3-hour delivery windows with 30-minute advance notice. No waiting around all day.</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">🛡️</div>
                    <h3 className="font-medium text-navy-900 mb-2">Zero Damage Record</h3>
                    <p className="text-navy-600 text-sm">500+ successful moves with comprehensive insurance and careful handling protocols.</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏢</div>
                    <h3 className="font-medium text-navy-900 mb-2">Building Expertise</h3>
                    <p className="text-navy-600 text-sm">We handle all building coordination, COI requirements, and elevator reservations.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Signals Section */}
        <section className="py-16 bg-cream-50">
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

        {/* Quick Links Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card variant="luxury">
                <CardContent>
                  <h3 className="text-xl font-serif font-bold text-navy-900 mb-4">
                    First Time Using ToteTaxi?
                  </h3>
                  <p className="text-navy-700 mb-6">
                    Learn about our services, see detailed pricing, and understand our white-glove process.
                  </p>
                  <div className="space-y-3">
                    <Link href="/services" className="block">
                      <Button variant="outline" className="w-full">
                        View All Services & Pricing
                      </Button>
                    </Link>
                    <Link href="/about" className="block">
                      <Button variant="ghost" className="w-full">
                        Learn About Our Company
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardContent>
                  <h3 className="text-xl font-serif font-bold text-navy-900 mb-4">
                    Have Questions?
                  </h3>
                  <p className="text-navy-700 mb-6">
                    Get answers to common questions or speak directly with our team for personalized assistance.
                  </p>
                  <div className="space-y-3">
                    <Link href="/faq" className="block">
                      <Button variant="outline" className="w-full">
                        Read FAQ
                      </Button>
                    </Link>
                    <Link href="/contact" className="block">
                      <Button variant="ghost" className="w-full">
                        Contact Our Team
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
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