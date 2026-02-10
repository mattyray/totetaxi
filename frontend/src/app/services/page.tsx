// frontend/src/app/services/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useBookingWizard } from '@/stores/booking-store';
import type { ServiceCatalog } from '@/types';

export default function ServicesPage() {
  const router = useRouter();
  const { updateBookingData, resetWizard } = useBookingWizard();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  const handleSelectPackage = (pkg: { id: string; package_type: string }) => {
    resetWizard();
    updateBookingData({
      service_type: 'mini_move',
      mini_move_package_id: pkg.id,
      package_type: pkg.package_type as 'petite' | 'standard' | 'full',
    });
    router.push('/book');
  };

  const handleSelectStandardDelivery = () => {
    resetWizard();
    updateBookingData({ service_type: 'standard_delivery' });
    router.push('/book');
  };

  const handleSelectAirportTransfer = () => {
    resetWizard();
    updateBookingData({ service_type: 'blade_transfer' });
    router.push('/book');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-navy-200 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-navy-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-4">
            Our Luxury Services
          </h1>
          <p className="text-lg text-navy-700 max-w-3xl mx-auto">
            White-glove transport tailored to your Manhattan-to-Hamptons lifestyle.
          </p>
        </div>

        {/* ============================================ */}
        {/* SERVICE OVERVIEW CARDS — quick book + anchor */}
        {/* ============================================ */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mini Move Cards */}
            {services?.mini_move_packages?.map((pkg) => (
              <Card
                key={pkg.id}
                variant={pkg.is_most_popular ? 'luxury' : 'elevated'}
                className="relative flex flex-col"
              >
                {pkg.is_most_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gold-500 text-navy-900 px-3 py-0.5 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="flex flex-col flex-1 pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-serif font-bold text-navy-900">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-navy-900 my-1">${pkg.base_price_dollars}</div>
                    {pkg.max_items && (
                      <p className="text-sm text-navy-600">Up to {pkg.max_items} items</p>
                    )}
                  </div>
                  <p className="text-sm text-navy-700 mb-4 flex-1">{pkg.description}</p>
                  <div className="space-y-2">
                    <Button
                      variant={pkg.is_most_popular ? 'primary' : 'outline'}
                      className="w-full"
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      Book Now
                    </Button>
                    <a
                      href="#mini-moves"
                      className="block text-center text-sm text-navy-600 hover:text-navy-900 hover:underline"
                    >
                      Learn more
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Standard Delivery Card */}
            {services?.standard_delivery && (
              <Card variant="elevated" className="flex flex-col">
                <CardContent className="flex flex-col flex-1 pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-serif font-bold text-navy-900">Standard Delivery</h3>
                    <div className="text-3xl font-bold text-navy-900 my-1">
                      ${services.standard_delivery.price_per_item_dollars}
                      <span className="text-base font-normal text-navy-600">/item</span>
                    </div>
                    <p className="text-sm text-navy-600">
                      Min {services.standard_delivery.minimum_items} items
                    </p>
                  </div>
                  <p className="text-sm text-navy-700 mb-4 flex-1">
                    Individual item delivery — clothing, documents, electronics, and seasonal essentials.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={handleSelectStandardDelivery}>
                      Book Now
                    </Button>
                    <a
                      href="#standard-delivery"
                      className="block text-center text-sm text-navy-600 hover:text-navy-900 hover:underline"
                    >
                      Learn more
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Airport Transfer Card */}
            <Card variant="elevated" className="flex flex-col">
              <CardContent className="flex flex-col flex-1 pt-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-serif font-bold text-navy-900">Airport Transfer</h3>
                  <div className="text-3xl font-bold text-navy-900 my-1">
                    $75<span className="text-base font-normal text-navy-600">/bag</span>
                  </div>
                  <p className="text-sm text-navy-600">JFK & Newark</p>
                </div>
                <p className="text-sm text-navy-700 mb-4 flex-1">
                  Premium luggage transport to or from the airport, timed to your flight.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={handleSelectAirportTransfer}>
                    Book Now
                  </Button>
                  <a
                    href="#airport-transfer"
                    className="block text-center text-sm text-navy-600 hover:text-navy-900 hover:underline"
                  >
                    Learn more
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* DETAIL SECTIONS                              */}
        {/* ============================================ */}

        {/* Mini Moves Detail */}
        <section id="mini-moves" className="mb-20 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-navy-900 mb-3">Mini Moves</h2>
            <p className="text-navy-700 max-w-2xl mx-auto">
              Complete packages for seasonal relocation. Everything you need for your Hamptons move,
              professionally handled from door to door.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {services?.mini_move_packages?.map((pkg) => (
              <Card key={pkg.id} variant="default">
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <h3 className="text-xl font-serif font-bold text-navy-900">{pkg.name}</h3>
                        <span className="text-2xl font-bold text-navy-900">${pkg.base_price_dollars}</span>
                        {pkg.max_items && (
                          <span className="text-sm text-navy-600">Up to {pkg.max_items} items</span>
                        )}
                      </div>
                      <p className="text-navy-700 text-sm mb-3">{pkg.description}</p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600">
                        <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Door-to-door</li>
                        <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Professional handling</li>
                        {pkg.protective_wrapping && (
                          <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Protective wrapping</li>
                        )}
                        {pkg.coi_included && (
                          <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>COI included</li>
                        )}
                        {pkg.priority_scheduling && (
                          <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Priority scheduling</li>
                        )}
                      </ul>
                    </div>
                    <Button
                      variant={pkg.is_most_popular ? 'primary' : 'outline'}
                      className="md:self-center shrink-0"
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      Select {pkg.name}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Organizing Add-On */}
            <Card variant="luxury">
              <CardContent>
                <h3 className="text-lg font-serif font-bold text-navy-900 text-center mb-4">
                  Professional Organizing Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Professional Packing</h4>
                    <p className="text-navy-700 text-sm">
                      Expert packing at your Manhattan location with premium materials.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">Professional Unpacking</h4>
                    <p className="text-navy-700 text-sm">
                      Arrive to your Hamptons home with everything unpacked and organized.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Standard Delivery Detail */}
        {services?.standard_delivery && (
          <section id="standard-delivery" className="mb-20 scroll-mt-24">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-3">Standard Delivery</h2>
              <p className="text-navy-700 max-w-2xl mx-auto">
                Individual item delivery for when you need specific items transported quickly and safely.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card variant="default">
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-2xl font-bold text-navy-900">
                          ${services.standard_delivery.price_per_item_dollars}/item
                        </span>
                        <span className="text-sm text-navy-600">
                          Min {services.standard_delivery.minimum_items} items &bull;
                          ${services.standard_delivery.minimum_charge_dollars} minimum
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600 mb-3">
                        <span>Clothing</span>
                        <span>Documents</span>
                        <span>Electronics</span>
                        <span>Seasonal items under {services.standard_delivery.max_weight_per_item_lbs} lbs</span>
                      </div>
                      <div className="inline-flex items-baseline gap-2 bg-gold-50 border border-gold-200 rounded px-3 py-1.5">
                        <span className="text-sm font-medium text-navy-900">Same-Day:</span>
                        <span className="font-bold text-navy-900">${services.standard_delivery.same_day_flat_rate_dollars}</span>
                        <span className="text-xs text-navy-600">order by 10 AM</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="md:self-center shrink-0"
                      onClick={handleSelectStandardDelivery}
                    >
                      Book Standard Delivery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Airport Transfer Detail */}
        <section id="airport-transfer" className="mb-20 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-navy-900 mb-3">Airport Transfer</h2>
            <p className="text-navy-700 max-w-2xl mx-auto">
              Premium luggage transport to and from JFK and Newark airports.
              We handle your bags so you can travel light.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card variant="default">
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="text-2xl font-bold text-navy-900">$75/bag</span>
                      <span className="text-sm text-navy-600">JFK & Newark (EWR)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="bg-gold-50 border border-gold-200 rounded px-3 py-2">
                        <span className="font-medium text-navy-900 text-sm">To Airport</span>
                        <p className="text-xs text-navy-600">Bags picked up at your door, delivered to your terminal</p>
                      </div>
                      <div className="bg-gold-50 border border-gold-200 rounded px-3 py-2">
                        <span className="font-medium text-navy-900 text-sm">From Airport</span>
                        <p className="text-xs text-navy-600">Bags collected at terminal, delivered to your door</p>
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600">
                      <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Terminal-specific service</li>
                      <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Real-time tracking</li>
                      <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>Timed to your flight</li>
                      <li className="flex items-center"><span className="text-green-500 mr-1.5">✓</span>No surcharges</li>
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    className="md:self-center shrink-0"
                    onClick={handleSelectAirportTransfer}
                  >
                    Book Airport Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Specialty Items */}
        {services?.specialty_items && services.specialty_items.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-3">Specialty Items</h2>
              <p className="text-navy-700 max-w-2xl mx-auto">
                Premium handling for your most valuable and unique items.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {services.specialty_items.map((item) => (
                <Card key={item.id} variant="default">
                  <CardContent>
                    <div className="text-center">
                      <h4 className="text-lg font-medium text-navy-900 mb-1">{item.name}</h4>
                      <div className="text-2xl font-bold text-navy-900 mb-2">${item.price_dollars}</div>
                      <p className="text-navy-600 text-sm mb-3">{item.description}</p>
                      {item.special_handling && (
                        <span className="inline-block bg-gold-100 text-gold-800 text-xs px-3 py-1 rounded-full">
                          Special Handling
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Service Areas */}
        <section className="mb-20">
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-2xl font-serif font-bold text-navy-900 text-center">Service Areas</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Pickup Locations</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>Manhattan (All neighborhoods)</li>
                    <li>Brooklyn (Select areas)</li>
                    <li>Long Island City</li>
                    <li>Hoboken & Jersey City</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Delivery Destinations</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>East Hampton</li>
                    <li>Southampton & Water Mill</li>
                    <li>Bridgehampton & Sagaponack</li>
                    <li>Westhampton Beach</li>
                    <li>Sag Harbor & North Haven</li>
                    <li>Montauk</li>
                  </ul>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-sm text-navy-600">
                  Don&apos;t see your location? <Link href="/contact" className="text-navy-900 hover:underline">Contact us</Link> for custom options.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
            Ready to Experience White-Glove Service?
          </h2>
          <p className="text-navy-700 mb-8 max-w-2xl mx-auto">
            Book your luxury move today and discover why discerning clients trust ToteTaxi
            for their Manhattan-to-Hamptons transport needs.
          </p>
          <Link href="/book">
            <Button variant="primary" size="lg">
              Start Your Booking
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
