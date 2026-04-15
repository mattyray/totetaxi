// frontend/src/app/services/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ServiceCatalog } from '@/types';
import { analytics } from '@/lib/analytics';

export default function ServicesPage() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-navy-200 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-navy-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const miniMoveStartPrice = services?.mini_move_packages?.[0]?.base_price_dollars;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Our Services
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto mb-4">
            From a single suitcase to a full seasonal move — door-to-door service between NYC and the Hamptons.
          </p>
          <p className="text-sm text-navy-600 max-w-2xl mx-auto mb-8">
            Not sure which service fits? Tap the chat bubble in the bottom-right — our AI assistant can help you pick.
          </p>
          <Link href="/book" onClick={() => analytics.startBooking('services_hero')}>
            <Button variant="primary" size="lg">
              Book Now
            </Button>
          </Link>
        </div>

        {/* Standard Delivery — now FIRST */}
        {services?.standard_delivery && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Standard Delivery</h2>
              <p className="text-lg text-navy-700 max-w-2xl mx-auto">
                Need to send a few things to the Hamptons? Pick your items, we&apos;ll handle the pickup, transport, and delivery.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <Card variant="elevated">
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="text-3xl font-bold text-navy-900 mb-2">
                        ${services.standard_delivery.price_per_item_dollars} per item
                      </div>
                      <p className="text-navy-600 mb-6">
                        ${services.standard_delivery.minimum_charge_dollars} minimum (covers 1–3 items) &bull; Each item up to {services.standard_delivery.max_weight_per_item_lbs} lbs
                      </p>

                      <div className="space-y-3">
                        <h4 className="font-medium text-navy-900">What&apos;s included:</h4>
                        <ul className="space-y-2 text-sm text-navy-700">
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Door-to-door pickup and delivery
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Morning pickup window (8 AM – 11 AM)
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Typical items: suitcases, duffels, boxes
                          </li>
                        </ul>
                      </div>

                      <div className="mt-6">
                        <Link href="/book" onClick={() => analytics.startBooking('services_standard_delivery')}>
                          <Button variant="primary" size="md">Book Standard Delivery</Button>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
                        <h4 className="font-medium text-navy-900 mb-3">Need it today?</h4>
                        <p className="text-sm text-navy-700 mb-4">
                          Rush deliveries are arranged by phone — call us and we&apos;ll see what we can do.
                        </p>
                        <a
                          href="tel:+16315955100"
                          className="inline-block text-navy-900 font-semibold hover:underline"
                        >
                          (631) 595-5100
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Specialty Items — merged into Standard Delivery */}
                  {services?.specialty_items && services.specialty_items.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-cream-200">
                      <h4 className="text-lg font-medium text-navy-900 mb-2">Have oversized items?</h4>
                      <p className="text-sm text-navy-600 mb-6">
                        We also ship specialty items — each priced individually and handled with extra care.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {services.specialty_items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-cream-200 bg-cream-50 p-4 text-center"
                          >
                            <h5 className="text-sm font-medium text-navy-900 mb-1">{item.name}</h5>
                            <div className="text-xl font-bold text-navy-900">
                              ${item.price_dollars}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Airport Transfer */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Airport Transfer</h2>
            <p className="text-lg text-navy-700 max-w-2xl mx-auto">
              Flying out of JFK or Newark? We pick up your bags at home, deliver them curbside — or the reverse on arrival.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card variant="elevated">
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="text-3xl font-bold text-navy-900 mb-2">
                      $75 per bag
                    </div>
                    <p className="text-navy-600 mb-6">
                      $150 minimum (covers up to 2 bags) &bull; JFK &amp; Newark (EWR) &bull; Terminal-specific pickup &amp; dropoff
                    </p>

                    <div className="space-y-3">
                      <h4 className="font-medium text-navy-900">What&apos;s included:</h4>
                      <ul className="space-y-2 text-sm text-navy-700">
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          Pickup from your NYC or Hamptons address
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          Terminal-specific drop-off
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          Real-time tracking
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          No weekend, geographic, or time-window surcharges
                        </li>
                      </ul>
                    </div>

                    <div className="mt-6">
                      <Link href="/book" onClick={() => analytics.startBooking('services_airport_transfer')}>
                        <Button variant="primary" size="md">Book Airport Transfer</Button>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-6 mb-4">
                      <h4 className="font-medium text-navy-900 mb-2">To Airport</h4>
                      <p className="text-sm text-navy-700">
                        We pick up your bags and deliver them to your terminal before your departure.
                      </p>
                    </div>
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
                      <h4 className="font-medium text-navy-900 mb-2">From Airport</h4>
                      <p className="text-sm text-navy-700">
                        We collect your bags at the terminal and deliver them to your door after you land.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Mini Moves — now LAST */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Mini Moves</h2>
            <p className="text-lg text-navy-700 max-w-2xl mx-auto mb-2">
              Doing a seasonal move? Our packages handle pickup, transport, and delivery of your full household.
            </p>
            {miniMoveStartPrice && (
              <p className="text-sm text-navy-600">
                Starting at ${miniMoveStartPrice}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {services?.mini_move_packages?.map((pkg) => {
              const tagline =
                pkg.package_type === 'petite' ? 'Best for a light seasonal move' :
                pkg.package_type === 'standard' ? 'Best for couples or a small family move' :
                pkg.package_type === 'full' ? 'Best for a full household move' :
                '';

              return (
                <Card
                  key={pkg.id}
                  variant={pkg.is_most_popular ? 'luxury' : 'elevated'}
                  className="relative flex flex-col"
                >
                  {pkg.is_most_popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gold-500 text-navy-900 px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <CardHeader>
                    <div className="text-center">
                      <h3 className="text-2xl font-serif font-bold text-navy-900 mb-1">
                        {pkg.name}
                      </h3>
                      {tagline && (
                        <p className="text-xs text-navy-500 italic mb-3">{tagline}</p>
                      )}
                      <div className="text-4xl font-bold text-navy-900 mb-2">
                        ${pkg.base_price_dollars}
                      </div>
                      {pkg.max_items ? (
                        <p className="text-sm text-navy-600">Up to {pkg.max_items} items (each under 50 lbs)</p>
                      ) : (
                        <p className="text-sm text-navy-600">Unlimited items (van capacity)</p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3 flex-1">
                      <h4 className="font-medium text-navy-900">What&apos;s included:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          Door-to-door pickup and delivery
                        </li>
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                          Professional handling and care
                        </li>
                        {pkg.package_type === 'full' && (
                          <li className="flex items-start text-sm text-navy-700">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Your own dedicated van — no sharing
                          </li>
                        )}
                        {pkg.protective_wrapping && (
                          <li className="flex items-start text-sm text-navy-700">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Premium protective wrapping
                          </li>
                        )}
                        {pkg.coi_included ? (
                          <li className="flex items-start text-sm text-navy-700">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Certificate of Insurance (COI) included
                          </li>
                        ) : (
                          <li className="flex items-start text-sm text-navy-600">
                            <span className="text-navy-400 mr-2 flex-shrink-0">+</span>
                            COI available for doorman buildings (+$50)
                          </li>
                        )}
                        {pkg.priority_scheduling && (
                          <li className="flex items-start text-sm text-navy-700">
                            <span className="text-green-500 mr-2 flex-shrink-0">&#10003;</span>
                            Priority scheduling
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="mt-6">
                      <Link
                        href="/book"
                        className="block"
                        onClick={() => analytics.startBooking(`services_mini_move_${pkg.package_type}`)}
                      >
                        <Button
                          variant={pkg.is_most_popular ? 'primary' : 'outline'}
                          size="md"
                          className="w-full"
                        >
                          Select {pkg.name}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Organizing Services Add-On */}
          <Card variant="luxury" className="mb-8">
            <CardHeader>
              <h3 className="text-xl font-serif font-bold text-navy-900 text-center">
                Add Professional Packing &amp; Unpacking
              </h3>
              <p className="text-sm text-navy-600 text-center mt-2">
                Optional add-on for any Mini Move — we handle the boxes so you don&apos;t have to.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-navy-900 mb-3">Professional Packing</h4>
                  <p className="text-navy-700 text-sm mb-4">
                    Our expert team carefully packs your belongings at your Manhattan location
                    using premium materials and techniques to ensure everything arrives pristine.
                  </p>
                  <ul className="space-y-1 text-sm text-navy-600">
                    <li>Premium packing materials included</li>
                    <li>Careful handling of delicate items</li>
                    <li>Efficient space optimization</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-navy-900 mb-3">Professional Unpacking</h4>
                  <p className="text-navy-700 text-sm mb-4">
                    Arrive to your Hamptons home with everything unpacked and organized exactly
                    how you want it. We handle the setup so you can start enjoying your retreat.
                  </p>
                  <ul className="space-y-1 text-sm text-navy-600">
                    <li>Complete unpacking and setup</li>
                    <li>Organized placement of belongings</li>
                    <li>Removal of all packing materials</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

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
                    <li>Hoboken &amp; Jersey City</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Delivery Destinations</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>East Hampton</li>
                    <li>Southampton &amp; Water Mill</li>
                    <li>Bridgehampton &amp; Sagaponack</li>
                    <li>Westhampton Beach</li>
                    <li>Sag Harbor &amp; North Haven</li>
                    <li>Montauk</li>
                  </ul>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-sm text-navy-600">
                  Don&apos;t see your location? <Link href="/contact" className="text-navy-900 hover:underline">Contact us</Link> for custom service options.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-4">
            Ready to book?
          </h2>
          <p className="text-navy-700 mb-8 max-w-2xl mx-auto">
            Or if you have questions first, tap the chat bubble in the bottom-right — our AI assistant can help you decide.
          </p>
          <Link href="/book" onClick={() => analytics.startBooking('services_bottom_cta')}>
            <Button variant="primary" size="lg">
              Start Your Booking
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
