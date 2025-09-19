'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ServiceCatalog } from '@/types';

// NYC tax rate
const TAX_RATE = 0.0825;

// Organizing service details by tier (from your backend data)
const ORGANIZING_SERVICES = {
  petite: {
    packing: {
      name: 'Petite Packing',
      description: '1/2 day (up to 4 hours) with 2 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $250).',
      price: 1400,
      duration: 4,
      organizers: 2,
      supplies: 250
    },
    unpacking: {
      name: 'Petite Unpacking', 
      description: '1/2 day (up to 4 hours) with 2 organizers. Organizing light (no supplies).',
      price: 1130,
      duration: 4,
      organizers: 2,
      supplies: 0
    }
  },
  standard: {
    packing: {
      name: 'Standard Packing',
      description: '1 day (up to 8 hours) with 2 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $250).',
      price: 2535,
      duration: 8,
      organizers: 2,
      supplies: 250
    },
    unpacking: {
      name: 'Standard Unpacking',
      description: '1 day (up to 8 hours) with 2 organizers. Organizing light (no supplies).',
      price: 2265,
      duration: 8,
      organizers: 2,
      supplies: 0
    }
  },
  full: {
    packing: {
      name: 'Full Packing',
      description: '1 day (up to 8 hours) with 4 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $500).',
      price: 5070,
      duration: 8,
      organizers: 4,
      supplies: 500
    },
    unpacking: {
      name: 'Full Unpacking',
      description: '1 day (up to 8 hours) with 4 organizers. Organizing light (no supplies).',
      price: 4530,
      duration: 8,
      organizers: 4,
      supplies: 0
    }
  }
};

function calculateWithTax(price: number) {
  const tax = price * TAX_RATE;
  return {
    subtotal: price,
    tax: tax,
    total: price + tax
  };
}

export function ServiceSelectionStep() {
  const { bookingData, updateBookingData, nextStep } = useBookingWizard();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  const handleMiniMoveSelect = (packageId: string) => {
    updateBookingData({
      service_type: 'mini_move',
      mini_move_package_id: packageId,
      // Clear other service selections
      standard_delivery_item_count: undefined,
      specialty_item_ids: undefined,
    });
  };

  const handleOrganizingServiceToggle = (serviceType: 'packing' | 'unpacking', enabled: boolean) => {
    updateBookingData({
      [serviceType === 'packing' ? 'include_packing' : 'include_unpacking']: enabled
    });
  };

  const canContinue = () => {
    return (
      (bookingData.service_type === 'mini_move' && bookingData.mini_move_package_id) ||
      (bookingData.service_type === 'standard_delivery' && bookingData.standard_delivery_item_count && bookingData.standard_delivery_item_count >= (services?.standard_delivery?.minimum_items || 3)) ||
      (bookingData.service_type === 'specialty_item' && bookingData.specialty_item_ids?.length)
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-navy-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Type Selector */}
      <div>
        <h3 className="text-lg font-medium text-navy-900 mb-4">Choose Your Service</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => updateBookingData({ service_type: 'mini_move' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'mini_move'
                ? 'border-navy-500 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-2">Mini Moves</h4>
            <p className="text-sm text-navy-600">Complete packages for seasonal relocation</p>
          </button>

          <button
            onClick={() => updateBookingData({ service_type: 'standard_delivery' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'standard_delivery'
                ? 'border-navy-500 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-2">Standard Delivery</h4>
            <p className="text-sm text-navy-600">Individual items, priced per piece</p>
          </button>

          <button
            onClick={() => updateBookingData({ service_type: 'specialty_item' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'specialty_item'
                ? 'border-navy-500 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-2">Specialty Items</h4>
            <p className="text-sm text-navy-600">Pelotons, surfboards, and more</p>
          </button>
        </div>
      </div>

      {/* Mini Moves */}
      {bookingData.service_type === 'mini_move' && services?.mini_move_packages && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.mini_move_packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                variant={bookingData.mini_move_package_id === pkg.id ? "luxury" : "default"}
                className="cursor-pointer"
                onClick={() => handleMiniMoveSelect(pkg.id)}
              >
                <CardHeader>
                  <div className="text-center">
                    <h4 className="font-medium text-navy-900">{pkg.name}</h4>
                    {pkg.is_most_popular && (
                      <span className="inline-block bg-gold-100 text-gold-800 text-xs px-2 py-1 rounded-full mt-1">
                        Most Popular
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-navy-900 mb-2">
                      ${pkg.base_price_dollars}
                    </div>
                    <p className="text-navy-600 text-sm mb-3">{pkg.description}</p>
                    <p className="text-xs text-navy-500">
                      {pkg.max_items ? `Up to ${pkg.max_items} items` : 'Unlimited items'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced Organizing Services */}
          {bookingData.mini_move_package_id && (
            <div>
              <h4 className="text-lg font-medium text-navy-900 mb-3">Professional Organizing Services</h4>
              <p className="text-sm text-navy-600 mb-4">
                Add professional packing and unpacking services. All prices include NYC tax (8.25%).
              </p>
              
              {(() => {
                const selectedPackage = services.mini_move_packages.find(p => p.id === bookingData.mini_move_package_id);
                const tier = selectedPackage?.package_type;
                const organizingOptions = tier ? ORGANIZING_SERVICES[tier] : null;
                
                if (!organizingOptions) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Packing Service */}
                    <Card 
                      variant={bookingData.include_packing ? "luxury" : "default"}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleOrganizingServiceToggle('packing', !bookingData.include_packing)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-navy-900">{organizingOptions.packing.name}</h5>
                          <input
                            type="checkbox"
                            checked={bookingData.include_packing || false}
                            onChange={() => handleOrganizingServiceToggle('packing', !bookingData.include_packing)}
                            className="h-4 w-4 text-navy-600 rounded"
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-navy-600 mb-4">{organizingOptions.packing.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-navy-700">Duration:</span>
                            <span className="font-medium text-navy-900">{organizingOptions.packing.duration} hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-700">Organizers:</span>
                            <span className="font-medium text-navy-900">{organizingOptions.packing.organizers} professionals</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-700">Supplies:</span>
                            <span className="font-medium text-navy-900">${organizingOptions.packing.supplies} allowance</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          {(() => {
                            const pricing = calculateWithTax(organizingOptions.packing.price);
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm text-navy-900">
                                  <span>Service:</span>
                                  <span className="font-medium">${pricing.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-navy-900">
                                  <span>Tax:</span>
                                  <span className="font-medium">${pricing.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-navy-900 text-base">
                                  <span>Total:</span>
                                  <span>${pricing.total.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Unpacking Service */}
                    <Card 
                      variant={bookingData.include_unpacking ? "luxury" : "default"}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleOrganizingServiceToggle('unpacking', !bookingData.include_unpacking)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-navy-900">{organizingOptions.unpacking.name}</h5>
                          <input
                            type="checkbox"
                            checked={bookingData.include_unpacking || false}
                            onChange={() => handleOrganizingServiceToggle('unpacking', !bookingData.include_unpacking)}
                            className="h-4 w-4 text-navy-600 rounded"
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-navy-600 mb-4">{organizingOptions.unpacking.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-navy-700">Duration:</span>
                            <span className="font-medium text-navy-900">{organizingOptions.unpacking.duration} hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-700">Organizers:</span>
                            <span className="font-medium text-navy-900">{organizingOptions.unpacking.organizers} professionals</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-700">Supplies:</span>
                            <span className="font-medium text-navy-900">Organizing only</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          {(() => {
                            const pricing = calculateWithTax(organizingOptions.unpacking.price);
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm text-navy-900">
                                  <span>Service:</span>
                                  <span className="font-medium">${pricing.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-navy-900">
                                  <span>Tax:</span>
                                  <span className="font-medium">${pricing.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-navy-900 text-base">
                                  <span>Total:</span>
                                  <span>${pricing.total.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Standard Delivery - unchanged */}
      {bookingData.service_type === 'standard_delivery' && services?.standard_delivery && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Standard Delivery Details</h3>
          <Card variant="elevated">
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Number of Items"
                  type="number"
                  min={services.standard_delivery.minimum_items}
                  value={bookingData.standard_delivery_item_count?.toString() || ''}
                  onChange={(e) => updateBookingData({ 
                    standard_delivery_item_count: parseInt(e.target.value) || undefined 
                  })}
                  placeholder={`Minimum ${services.standard_delivery.minimum_items} items`}
                  helper={`$${services.standard_delivery.price_per_item_dollars} per item • $${services.standard_delivery.minimum_charge_dollars} minimum`}
                />

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bookingData.is_same_day_delivery || false}
                    onChange={(e) => updateBookingData({ is_same_day_delivery: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-navy-900 font-medium">
                    Same-Day Delivery (+$${services.standard_delivery.same_day_flat_rate_dollars})
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Specialty Items - unchanged */}
      {bookingData.service_type === 'specialty_item' && services?.specialty_items && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Specialty Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.specialty_items.map((item) => (
              <label 
                key={item.id}
                className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={bookingData.specialty_item_ids?.includes(item.id) || false}
                  onChange={(e) => {
                    const currentIds = bookingData.specialty_item_ids || [];
                    const newIds = e.target.checked
                      ? [...currentIds, item.id]
                      : currentIds.filter(id => id !== item.id);
                    updateBookingData({ specialty_item_ids: newIds });
                  }}
                  className="mr-4"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-navy-900">{item.name}</h4>
                  <p className="text-sm text-navy-600 mb-1">{item.description}</p>
                  <div className="text-lg font-bold text-navy-900">${item.price_dollars}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={nextStep}
          disabled={!canContinue()}
          size="lg"
        >
          Continue to Date & Time →
        </Button>
      </div>
    </div>
  );
}