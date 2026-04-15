// frontend/src/components/marketing/service-showcase.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBookingWizard } from '@/stores/booking-store';
import { analytics } from '@/lib/analytics';
import type { ServiceCatalog } from '@/types';

export function ServiceShowcase() {
  const router = useRouter();
  const { updateBookingData, resetWizard } = useBookingWizard();

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-cream-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-navy-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-navy-100 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-cream-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-600">Unable to load services</p>
        </div>
      </section>
    );
  }

  const miniMoveStartPrice = services?.mini_move_packages?.[0]?.base_price_dollars;

  // Handler for selecting a mini move package — prefills the wizard
  const handleSelectPackage = (pkg: { id: string; package_type: string }) => {
    resetWizard();
    updateBookingData({
      service_type: 'mini_move',
      mini_move_package_id: pkg.id,
      package_type: pkg.package_type as 'petite' | 'standard' | 'full',
    });
    analytics.startBooking(`home_mini_move_${pkg.package_type}`);
    router.push('/book');
  };

  const handleSelectStandard = () => {
    resetWizard();
    updateBookingData({ service_type: 'standard_delivery' });
    analytics.startBooking('home_standard_delivery');
    router.push('/book');
  };

  const handleSelectAirport = () => {
    resetWizard();
    updateBookingData({ service_type: 'blade_transfer' });
    analytics.startBooking('home_airport_transfer');
    router.push('/book');
  };

  return (
    <section className="py-16 bg-cream-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            Our Services
          </h2>
          <p className="text-lg text-navy-700 max-w-2xl mx-auto">
            From a single suitcase to a full seasonal move — door-to-door service between NYC and the Hamptons.
          </p>
        </div>

        {/* Standard Delivery — FIRST */}
        {services?.standard_delivery && (
          <div className="mb-16">
            <h3 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
              Standard Delivery
            </h3>
            <div className="max-w-4xl mx-auto">
              <Card variant="elevated">
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-2xl font-bold text-navy-900 mb-2">
                        ${services.standard_delivery.price_per_item_dollars} per item
                      </div>
                      <p className="text-navy-600 mb-4">
                        ${services.standard_delivery.minimum_charge_dollars} minimum (covers 1–3 items) • Each item up to {services.standard_delivery.max_weight_per_item_lbs} lbs
                      </p>
                      <p className="text-sm text-navy-700 mb-4">
                        Ship suitcases, duffels, boxes — door-to-door with morning pickup windows.
                      </p>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleSelectStandard}
                      >
                        Book Standard Delivery
                      </Button>
                    </div>

                    <div>
                      <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                        <h4 className="font-medium text-navy-900 mb-1">Need it today?</h4>
                        <p className="text-sm text-navy-700 mb-2">
                          Rush deliveries are arranged by phone.
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

                  {/* Specialty Items merged in */}
                  {services?.specialty_items && services.specialty_items.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-cream-200">
                      <h4 className="text-lg font-medium text-navy-900 mb-2">Have oversized items?</h4>
                      <p className="text-sm text-navy-600 mb-4">
                        We also ship specialty items, each priced individually.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {services.specialty_items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-cream-200 bg-cream-50 p-3 text-center"
                          >
                            <h5 className="text-sm font-medium text-navy-900 mb-1">{item.name}</h5>
                            <div className="text-lg font-bold text-navy-900">
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
          </div>
        )}

        {/* Airport Transfer — SECOND */}
        <div className="mb-16">
          <h3 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
            Airport Transfer
          </h3>
          <div className="max-w-4xl mx-auto">
            <Card variant="elevated">
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-navy-900 mb-2">
                    $75 per bag
                  </div>
                  <p className="text-navy-600 mb-4">
                    $150 minimum (covers up to 2 bags) • JFK &amp; Newark (EWR)
                  </p>
                  <p className="text-sm text-navy-700 mb-4">
                    Door-to-terminal luggage transfer in both directions — we pick up before your departure or collect your bags on arrival.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="inline-block bg-blue-50 text-blue-800 text-xs px-3 py-1 rounded-full">
                      To Airport
                    </span>
                    <span className="inline-block bg-green-50 text-green-800 text-xs px-3 py-1 rounded-full">
                      From Airport
                    </span>
                    <span className="inline-block bg-gold-50 text-gold-800 text-xs px-3 py-1 rounded-full">
                      Terminal Selection
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSelectAirport}
                  >
                    Book Airport Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mini Moves — LAST */}
        <div>
          <div className="text-center mb-8">
            <h3 className="text-2xl font-serif font-bold text-navy-900 mb-2">
              Mini Moves
            </h3>
            {miniMoveStartPrice && (
              <p className="text-sm text-navy-600">
                Full-household packages, starting at ${miniMoveStartPrice}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services?.mini_move_packages?.map((pkg) => {
              const tagline =
                pkg.package_type === 'petite' ? 'Best for a light seasonal move' :
                pkg.package_type === 'standard' ? 'Best for couples or a small family' :
                pkg.package_type === 'full' ? 'Best for a full household move' :
                '';

              return (
                <Card
                  key={pkg.id}
                  variant={pkg.is_most_popular ? 'luxury' : 'elevated'}
                  className="relative"
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
                      <h4 className="text-xl font-serif font-bold text-navy-900 mb-1">
                        {pkg.name}
                      </h4>
                      {tagline && (
                        <p className="text-xs text-navy-500 italic mb-3">{tagline}</p>
                      )}
                      <div className="text-3xl font-bold text-navy-900 mb-2">
                        ${pkg.base_price_dollars}
                      </div>
                      {pkg.max_items ? (
                        <p className="text-navy-600 text-sm">
                          Up to {pkg.max_items} items (each under 50 lbs)
                        </p>
                      ) : (
                        <p className="text-navy-600 text-sm">
                          Unlimited items (van capacity)
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {pkg.package_type === 'full' && (
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                          Dedicated van — no sharing
                        </li>
                      )}
                      {pkg.coi_included ? (
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                          COI included
                        </li>
                      ) : (
                        <li className="flex items-start text-sm text-navy-600">
                          <span className="text-navy-400 mr-2 flex-shrink-0">+</span>
                          COI available (+$50)
                        </li>
                      )}
                      {pkg.priority_scheduling && (
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                          Priority scheduling
                        </li>
                      )}
                      {pkg.protective_wrapping && (
                        <li className="flex items-start text-sm text-navy-700">
                          <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                          Protective wrapping
                        </li>
                      )}
                    </ul>

                    <Button
                      variant={pkg.is_most_popular ? 'primary' : 'outline'}
                      className="w-full"
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      Select {pkg.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
