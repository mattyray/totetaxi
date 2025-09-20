// frontend/src/app/page.tsx - Using real ToteTaxi information
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ServiceShowcase } from '@/components/marketing/service-showcase';
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
              Door-to-Door Delivery Service
            </h1>
            <p className="text-xl text-navy-700 mb-4 max-w-3xl mx-auto">
              Tote Taxi will deliver your luggage to and from the city stress-free.
            </p>
            <p className="text-lg text-navy-600 mb-8 max-w-2xl mx-auto">
              From suitcases to surfboards, Pelotons to pop-up props — we handle it all between 
              NYC, the Hamptons, South Florida, and all major airports.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" onClick={openBookingWizard}>
                Book Now
              </Button>
              <Link href="/services">
                <Button variant="outline" size="lg">
                  View Services & Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works - Simple 3 Step */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
              Same Day Delivery Made Stress-Free
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📱</div>
                    <h3 className="text-xl font-medium text-navy-900 mb-3">Pickup</h3>
                    <p className="text-navy-700">Schedule a pickup and we&apos;ll come to you.</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">✈️</div>
                    <h3 className="text-xl font-medium text-navy-900 mb-3">Travel</h3>
                    <p className="text-navy-700">You travel hands-free. Très chic!</p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">🚚</div>
                    <h3 className="text-xl font-medium text-navy-900 mb-3">Delivery</h3>
                    <p className="text-navy-700">We&apos;ll deliver to your desired destination.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Service Showcase */}
        <ServiceShowcase />

        {/* Customer Testimonials */}
        <section className="py-16 bg-cream-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold text-navy-900 text-center mb-12">
              What Our Customers Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="elevated">
                <CardContent>
                  <p className="text-navy-700 text-sm mb-4">
                    &quot;I&apos;ve heard amazing things about Tote Taxi for awhile now and finally used it for 
                    the first time today when I took Blade from JFK to Manhattan and LOVED it! 
                    It was so easy and seamless!&quot;
                  </p>
                  <p className="font-medium text-navy-900">- Natalie M.</p>
                </CardContent>
              </Card>
              
              <Card variant="elevated">
                <CardContent>
                  <p className="text-navy-700 text-sm mb-4">
                    &quot;We have been using Tote Taxi for the last three years when we come out to 
                    East Hampton and when we head back to the city. They&apos;ve always been wonderful! 
                    Makes moving bikes and extras easy and stress free!&quot;
                  </p>
                  <p className="font-medium text-navy-900">- Kimberly R.</p>
                </CardContent>
              </Card>
              
              <Card variant="elevated">
                <CardContent>
                  <p className="text-navy-700 text-sm mb-4">
                    &quot;Tote Taxi was a lifesaver! They were so easy to coordinate with, showed up 
                    exactly on time, communicated well. I highly recommend their services.&quot;
                  </p>
                  <p className="font-medium text-navy-900">- Robyn M.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Service Areas */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
                Where We Deliver
              </h2>
              <p className="text-lg text-navy-700">
                Comprehensive delivery service across multiple locations
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🏙️</div>
                <h3 className="font-medium text-navy-900 mb-2">NYC</h3>
                <p className="text-navy-600 text-sm">Manhattan, Brooklyn, and surrounding areas</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏖️</div>
                <h3 className="font-medium text-navy-900 mb-2">The Hamptons</h3>
                <p className="text-navy-600 text-sm">East Hampton, Southampton, Montauk, and more</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">✈️</div>
                <h3 className="font-medium text-navy-900 mb-2">NYC Airports</h3>
                <p className="text-navy-600 text-sm">JFK, LaGuardia, Newark</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🌴</div>
                <h3 className="font-medium text-navy-900 mb-2">South Florida</h3>
                <p className="text-navy-600 text-sm">Palm Beach, Miami, Boca Raton, Jupiter</p>
              </div>
            </div>
          </div>
        </section>

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
                <div className="text-4xl mb-4">🚁</div>
                <h3 className="font-medium text-navy-900 mb-2">BLADE</h3>
                <p className="text-navy-600 text-sm">Official luggage delivery partner for helicopter transfers</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="font-medium text-navy-900 mb-2">Cultured Magazine</h3>
                <p className="text-navy-600 text-sm">Trusted delivery partner</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🧳</div>
                <h3 className="font-medium text-navy-900 mb-2">Luggage Free</h3>
                <p className="text-navy-600 text-sm">Partner in luggage logistics</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
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