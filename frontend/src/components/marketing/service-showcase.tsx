'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ServiceCatalog } from '@/types';

export function ServiceShowcase() {
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

  return (
    <section className="py-16 bg-cream-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            Our Luxury Services
          </h2>
          <p className="text-lg text-navy-700 max-w-2xl mx-auto">
            From weekend getaways to seasonal relocations, we handle your Hamptons transport with premium care.
          </p>
        </div>

        {/* Mini Move Packages */}
        <div className="mb-16">
          <h3 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
            Mini Moves
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services?.mini_move_packages?.map((pkg) => (
              <Card 
                key={pkg.id} 
                variant={pkg.is_most_popular ? "luxury" : "elevated"}
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
                    <h4 className="text-xl font-serif font-bold text-navy-900 mb-2">
                      {pkg.name}
                    </h4>
                    <div className="text-3xl font-bold text-navy-900 mb-2">
                      ${pkg.base_price_dollars}
                    </div>
                    {pkg.max_items && (
                      <p className="text-navy-600 text-sm">
                        Up to {pkg.max_items} items
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-navy-700 text-sm mb-4">{pkg.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {pkg.coi_included && (
                      <li className="flex items-center text-sm text-navy-700">
                        <span className="text-green-500 mr-2">✓</span>
                        COI Included
                      </li>
                    )}
                    {pkg.features.priority_scheduling && (
                      <li className="flex items-center text-sm text-navy-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Priority Scheduling
                      </li>
                    )}
                    {pkg.features.protective_wrapping && (
                      <li className="flex items-center text-sm text-navy-700">
                        <span className="text-green-500 mr-2">✓</span>
                        Protective Wrapping
                      </li>
                    )}
                  </ul>
                  
                  <Button 
                    variant={pkg.is_most_popular ? "primary" : "outline"} 
                    className="w-full"
                  >
                    Select {pkg.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Standard Delivery */}
        {services?.standard_delivery && (
          <div className="mb-16">
            <h3 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
              Standard Delivery
            </h3>
            <div className="max-w-2xl mx-auto">
              <Card variant="elevated">
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-navy-900 mb-2">
                      ${services.standard_delivery.price_per_item_dollars} per item
                    </div>
                    <p className="text-navy-600 mb-4">
                      Minimum {services.standard_delivery.minimum_items} items • ${services.standard_delivery.minimum_charge_dollars} minimum
                    </p>
                    <p className="text-sm text-navy-700 mb-4">
                      Perfect for individual items under {services.standard_delivery.max_weight_per_item_lbs} lbs each
                    </p>
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-4">
                      <p className="text-gold-800 font-medium">
                        Same-Day Delivery: ${services.standard_delivery.same_day_flat_rate_dollars}
                      </p>
                    </div>
                    <Button variant="outline" className="w-full">
                      Calculate Your Delivery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Specialty Items */}
        {services?.specialty_items && services.specialty_items.length > 0 && (
          <div>
            <h3 className="text-2xl font-serif font-bold text-navy-900 text-center mb-8">
              Specialty Items
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.specialty_items.map((item) => (
                <Card key={item.id} variant="default">
                  <CardContent>
                    <div className="text-center">
                      <h4 className="font-medium text-navy-900 mb-2">{item.name}</h4>
                      <div className="text-xl font-bold text-navy-900 mb-2">
                        ${item.price_dollars}
                      </div>
                      <p className="text-navy-600 text-sm mb-3">{item.description}</p>
                      {item.special_handling && (
                        <span className="inline-block bg-gold-100 text-gold-800 text-xs px-2 py-1 rounded">
                          Special Handling
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}