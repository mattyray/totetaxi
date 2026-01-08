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

  // Handler for selecting a mini move package
  const handleSelectPackage = (pkg: { id: string; package_type: string }) => {
    console.log('Button clicked! Package:', pkg);
    resetWizard();
    updateBookingData({
      service_type: 'mini_move',
      mini_move_package_id: pkg.id,
      package_type: pkg.package_type as 'petite' | 'standard' | 'full',
    });
    router.push('/book');
  };

  // Handler for standard delivery
  const handleSelectStandardDelivery = () => {
    resetWizard();
    updateBookingData({
      service_type: 'standard_delivery',
    });
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
                <div key={i} className="h-64 bg-navy-200 rounded"></div>
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
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 mb-6">
            Our Luxury Services
          </h1>
          <p className="text-xl text-navy-700 max-w-3xl mx-auto">
            From weekend essentials to full seasonal relocations, we provide white-glove service 
            tailored to your Manhattan-to-Hamptons lifestyle.
          </p>
        </div>

        {/* Mini Moves - Featured Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Mini Moves</h2>
            <p className="text-lg text-navy-700 max-w-2xl mx-auto">
              Complete packages designed for seasonal relocation. Everything you need for your Hamptons move, 
              professionally handled from door to door.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
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
                    <h3 className="text-2xl font-serif font-bold text-navy-900 mb-2">
                      {pkg.name}
                    </h3>
                    <div className="text-4xl font-bold text-navy-900 mb-4">
                      ${pkg.base_price_dollars}
                    </div>
                    {pkg.max_items && (
                      <p className="text-navy-600">Up to {pkg.max_items} items</p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-navy-700 mb-6">{pkg.description}</p>
                  
                  <div className="space-y-3 mb-8">
                    <h4 className="font-medium text-navy-900">What's Included:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm text-navy-700">
                        <span className="text-green-500 mr-3">✓</span>
                        Door-to-door pickup and delivery
                      </li>
                      <li className="flex items-center text-sm text-navy-700">
                        <span className="text-green-500 mr-3">✓</span>
                        Professional handling and care
                      </li>
                      {pkg.protective_wrapping && (
                        <li className="flex items-center text-sm text-navy-700">
                          <span className="text-green-500 mr-3">✓</span>
                          Premium protective wrapping
                        </li>
                      )}
                      {pkg.coi_included && (
                        <li className="flex items-center text-sm text-navy-700">
                          <span className="text-green-500 mr-3">✓</span>
                          Certificate of Insurance included
                        </li>
                      )}
                      {pkg.priority_scheduling && (
                        <li className="flex items-center text-sm text-navy-700">
                          <span className="text-green-500 mr-3">✓</span>
                          Priority scheduling
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <Button
                    variant={pkg.is_most_popular ? "primary" : "outline"}
                    className="w-full"
                    onClick={() => handleSelectPackage(pkg)}
                  >
                    Select {pkg.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Organizing Services Add-On */}
          <Card variant="luxury" className="mb-8">
            <CardHeader>
              <h3 className="text-xl font-serif font-bold text-navy-900 text-center">
                Professional Organizing Services
              </h3>
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
                    <li>• Premium packing materials included</li>
                    <li>• Careful handling of delicate items</li>
                    <li>• Efficient space optimization</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-navy-900 mb-3">Professional Unpacking</h4>
                  <p className="text-navy-700 text-sm mb-4">
                    Arrive to your Hamptons home with everything unpacked and organized exactly 
                    how you want it. We handle the setup so you can start enjoying your retreat.
                  </p>
                  <ul className="space-y-1 text-sm text-navy-600">
                    <li>• Complete unpacking and setup</li>
                    <li>• Organized placement of belongings</li>
                    <li>• Removal of all packing materials</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Standard Delivery */}
        {services?.standard_delivery && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Standard Delivery</h2>
              <p className="text-lg text-navy-700 max-w-2xl mx-auto">
                Individual item delivery for when you need specific items transported quickly and safely.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card variant="elevated">
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="text-3xl font-bold text-navy-900 mb-2">
                        ${services.standard_delivery.price_per_item_dollars} per item
                      </div>
                      <p className="text-navy-600 mb-4">
                        Minimum {services.standard_delivery.minimum_items} items • 
                        ${services.standard_delivery.minimum_charge_dollars} minimum charge
                      </p>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-navy-900">Perfect for:</h4>
                        <ul className="space-y-2 text-sm text-navy-700">
                          <li>• Individual clothing items</li>
                          <li>• Documents and files</li>
                          <li>• Small electronics</li>
                          <li>• Seasonal items under {services.standard_delivery.max_weight_per_item_lbs} lbs</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div>
                      <div className="bg-gold-50 border border-gold-200 rounded-lg p-6">
                        <h4 className="font-medium text-navy-900 mb-3">Same-Day Delivery</h4>
                        <div className="text-2xl font-bold text-navy-900 mb-2">
                          ${services.standard_delivery.same_day_flat_rate_dollars}
                        </div>
                        <p className="text-sm text-navy-700 mb-4">
                          Need it today? We offer same-day delivery for urgent items.
                        </p>
                        <ul className="space-y-1 text-xs text-navy-600">
                          <li>• Order by 10 AM for same-day delivery</li>
                          <li>• Available Thursday through Monday</li>
                          <li>• Subject to availability</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Specialty Items */}
        {services?.specialty_items && services.specialty_items.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-navy-900 mb-4">Specialty Items</h2>
              <p className="text-lg text-navy-700 max-w-2xl mx-auto">
                Premium handling for your most valuable and unique items. Each specialty item receives 
                custom care and attention.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.specialty_items.map((item) => (
                <Card key={item.id} variant="default">
                  <CardContent>
                    <div className="text-center">
                      <h4 className="text-lg font-medium text-navy-900 mb-2">{item.name}</h4>
                      <div className="text-2xl font-bold text-navy-900 mb-3">
                        ${item.price_dollars}
                      </div>
                      <p className="text-navy-600 text-sm mb-4">{item.description}</p>
                      
                      {item.special_handling && (
                        <div className="mb-4">
                          <span className="inline-block bg-gold-100 text-gold-800 text-xs px-3 py-1 rounded-full">
                            Special Handling Included
                          </span>
                        </div>
                      )}
                      
                      {item.requires_van_schedule && (
                        <p className="text-xs text-navy-500">
                          * Requires scheduled van delivery
                        </p>
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
                    <li>• Manhattan (All neighborhoods)</li>
                    <li>• Brooklyn (Select areas)</li>
                    <li>• Long Island City</li>
                    <li>• Hoboken & Jersey City</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-navy-900 mb-3">Delivery Destinations</h3>
                  <ul className="space-y-2 text-navy-700">
                    <li>• East Hampton</li>
                    <li>• Southampton & Water Mill</li>
                    <li>• Bridgehampton & Sagaponack</li>
                    <li>• Westhampton Beach</li>
                    <li>• Sag Harbor & North Haven</li>
                    <li>• Montauk</li>
                  </ul>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-sm text-navy-600">
                  Don't see your location? <Link href="/contact" className="text-navy-900 hover:underline">Contact us</Link> for custom service options.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
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