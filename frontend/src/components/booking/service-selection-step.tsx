'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { ServiceCatalog } from '@/types';

const TAX_RATE = 0.0825;

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
  const [packingExpanded, setPackingExpanded] = useState(false);
  const [unpackingExpanded, setUnpackingExpanded] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');

  console.log('SERVICE STEP - Current booking data:', bookingData);
  console.log('mini_move_package_id:', bookingData.mini_move_package_id);
  console.log('service_type:', bookingData.service_type);

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  const validateBladeData = () => {
    setDateError('');
    setTimeError('');
    
    if (!bookingData.blade_airport) {
      return false;
    }
    
    if (!bookingData.blade_flight_date) {
      setDateError('Please select your flight date');
      return false;
    }
    
    // Validate date is at least tomorrow
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const selected = new Date(bookingData.blade_flight_date + 'T00:00:00');
    
    if (selected < tomorrow) {
      setDateError('Flight must be booked at least 1 day in advance');
      return false;
    }
    
    if (!bookingData.blade_flight_time) {
      setTimeError('Please select your flight departure time');
      return false;
    }
    
    if (!bookingData.blade_bag_count || bookingData.blade_bag_count < 2) {
      return false;
    }
    
    return true;
  };

  const handleContinue = () => {
    if (bookingData.service_type === 'blade_transfer') {
      if (!validateBladeData()) {
        return; // Don't proceed if validation fails
      }
    }
    
    nextStep();
  };

  const handleMiniMoveSelect = (packageId: string) => {
    const selectedPackage = services?.mini_move_packages.find(pkg => pkg.id === packageId);
    
    console.log('SELECTING PACKAGE:', packageId);
    console.log('Package Type:', selectedPackage?.package_type);
    console.log('Package Name:', selectedPackage?.name);
    
    updateBookingData({
      service_type: 'mini_move',
      mini_move_package_id: packageId,
      package_type: selectedPackage?.package_type,
      standard_delivery_item_count: undefined,
      specialty_item_ids: undefined,
      blade_airport: undefined,
      blade_flight_date: undefined,
      blade_flight_time: undefined,
      blade_bag_count: undefined,
    });
    
    console.log('Updated booking data - new state should have package_id:', packageId);
  };

  const handleOrganizingServiceToggle = (serviceType: 'packing' | 'unpacking', enabled: boolean) => {
    updateBookingData({
      [serviceType === 'packing' ? 'include_packing' : 'include_unpacking']: enabled
    });
    
    if (enabled) {
      if (serviceType === 'packing') {
        setPackingExpanded(true);
      } else {
        setUnpackingExpanded(true);
      }
    }
  };

  const canContinue = () => {
    if (bookingData.service_type === 'mini_move') {
      return !!bookingData.mini_move_package_id;
    }
    
    if (bookingData.service_type === 'standard_delivery') {
      const itemCount = bookingData.standard_delivery_item_count || 0;
      const specialtyCount = bookingData.specialty_item_ids?.length || 0;
      return itemCount > 0 || specialtyCount > 0;
    }
    
    if (bookingData.service_type === 'blade_transfer') {
      return !!(
        bookingData.blade_airport &&
        bookingData.blade_flight_date &&
        bookingData.blade_flight_time &&
        bookingData.blade_bag_count &&
        bookingData.blade_bag_count >= 2
      );
    }
    
    return false;
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
      <div>
        <h3 className="text-lg font-medium text-navy-900 mb-4">Choose Your Service</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => updateBookingData({ 
              service_type: 'mini_move',
              standard_delivery_item_count: undefined,
              specialty_item_ids: undefined,
              blade_airport: undefined,
              blade_flight_date: undefined,
              blade_flight_time: undefined,
              blade_bag_count: undefined,
            })}
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
            onClick={() => updateBookingData({ 
              service_type: 'standard_delivery',
              mini_move_package_id: undefined,
              package_type: undefined,
              include_packing: false,
              include_unpacking: false,
              blade_airport: undefined,
              blade_flight_date: undefined,
              blade_flight_time: undefined,
              blade_bag_count: undefined,
            })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'standard_delivery'
                ? 'border-navy-500 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-2">Standard Delivery</h4>
            <p className="text-sm text-navy-600">Regular items + specialty items</p>
          </button>

          <button
            onClick={() => updateBookingData({ 
              service_type: 'blade_transfer',
              mini_move_package_id: undefined,
              package_type: undefined,
              include_packing: false,
              include_unpacking: false,
              standard_delivery_item_count: undefined,
              specialty_item_ids: undefined,
            })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'blade_transfer'
                ? 'border-navy-500 bg-navy-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-2">BLADE Airport Transfer</h4>
            <p className="text-sm text-navy-600">NYC → Airport luggage delivery</p>
            <p className="text-xs text-navy-500 mt-2">JFK/EWR only</p>
          </button>
        </div>
      </div>

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

          {bookingData.mini_move_package_id && (
            <div>
              <h4 className="text-lg font-medium text-navy-900 mb-3">Professional Organizing Services</h4>
              <p className="text-sm text-navy-600 mb-4">
                Add professional packing and unpacking services. Click to view details and pricing.
              </p>
              
              {(() => {
                const selectedPackage = services.mini_move_packages.find(p => p.id === bookingData.mini_move_package_id);
                const tier = selectedPackage?.package_type;
                const organizingOptions = tier ? ORGANIZING_SERVICES[tier] : null;
                
                if (!organizingOptions) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card 
                      variant={bookingData.include_packing ? "luxury" : "default"}
                      className="transition-all"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={bookingData.include_packing || false}
                              onChange={(e) => handleOrganizingServiceToggle('packing', e.target.checked)}
                              className="h-4 w-4 text-navy-600 rounded"
                            />
                            <h5 className="font-semibold text-navy-900">{organizingOptions.packing.name}</h5>
                          </div>
                          <button
                            onClick={() => setPackingExpanded(!packingExpanded)}
                            className="text-navy-600 hover:text-navy-900"
                          >
                            {packingExpanded || bookingData.include_packing ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        
                        {!packingExpanded && !bookingData.include_packing && (
                          <p className="text-sm text-navy-600 mt-2">
                            {organizingOptions.packing.duration} hours • {organizingOptions.packing.organizers} organizers • Supplies included
                          </p>
                        )}
                      </CardHeader>
                      
                      {(packingExpanded || bookingData.include_packing) && (
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
                      )}
                    </Card>

                    <Card 
                      variant={bookingData.include_unpacking ? "luxury" : "default"}
                      className="transition-all"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={bookingData.include_unpacking || false}
                              onChange={(e) => handleOrganizingServiceToggle('unpacking', e.target.checked)}
                              className="h-4 w-4 text-navy-600 rounded"
                            />
                            <h5 className="font-semibold text-navy-900">{organizingOptions.unpacking.name}</h5>
                          </div>
                          <button
                            onClick={() => setUnpackingExpanded(!unpackingExpanded)}
                            className="text-navy-600 hover:text-navy-900"
                          >
                            {unpackingExpanded || bookingData.include_unpacking ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        
                        {!unpackingExpanded && !bookingData.include_unpacking && (
                          <p className="text-sm text-navy-600 mt-2">
                            {organizingOptions.unpacking.duration} hours • {organizingOptions.unpacking.organizers} organizers • Organizing only
                          </p>
                        )}
                      </CardHeader>
                      
                      {(unpackingExpanded || bookingData.include_unpacking) && (
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
                      )}
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {bookingData.service_type === 'standard_delivery' && services?.standard_delivery && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-navy-900 mb-4">Configure Your Delivery</h3>
          
          <Card variant="elevated">
            <CardHeader>
              <h4 className="font-medium text-navy-900">Regular Items (Optional)</h4>
            </CardHeader>
            <CardContent>
              <Input
                label="Number of Items"
                type="number"
                min={0}
                value={bookingData.standard_delivery_item_count?.toString() || '0'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateBookingData({ standard_delivery_item_count: 0 });
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 0) {
                      updateBookingData({ standard_delivery_item_count: numValue });
                    }
                  }
                }}
                placeholder="Enter 0 if booking specialty items only"
                helper={`$${services.standard_delivery.price_per_item_dollars} per item (under 50 lbs) • $${services.standard_delivery.minimum_charge_dollars} minimum applies to 1-3 items`}
              />
              
              <div className="mt-3 bg-gold-50 border border-gold-200 rounded-lg p-3">
                <p className="text-sm text-gold-800">
                  <strong>Note:</strong> Standard pricing applies to items under 50 lbs each. 
                  Overweight items may incur additional charges.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <h4 className="font-medium text-navy-900">Specialty Items (Optional)</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services.specialty_items.map((item) => (
                  <label 
                    key={item.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
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
                      className="mr-3"
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-navy-900">{item.name}</div>
                        <div className="text-sm text-navy-600">{item.description}</div>
                      </div>
                      <div className="text-lg font-bold text-navy-900 ml-4">${item.price_dollars}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Item not listed?</strong> Contact us for a custom quote: <strong>(631) 595-5100</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bookingData.is_same_day_delivery || false}
                  onChange={(e) => updateBookingData({ is_same_day_delivery: e.target.checked })}
                  className="mr-3"
                />
                <span className="text-navy-900 font-medium">
                  Same-Day Delivery (+$360)
                </span>
              </label>
            </CardContent>
          </Card>

          {((bookingData.standard_delivery_item_count || 0) === 0 && (!bookingData.specialty_item_ids || bookingData.specialty_item_ids.length === 0)) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">
                Please select at least one regular item or specialty item to continue.
              </p>
            </div>
          )}
        </div>
      )}

      {bookingData.service_type === 'blade_transfer' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-navy-900 mb-4">BLADE Flight Details</h3>
          
          <Card variant="elevated">
            <CardHeader>
              <h4 className="font-medium text-navy-900">Airport Selection</h4>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateBookingData({ blade_airport: 'JFK' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    bookingData.blade_airport === 'JFK'
                      ? 'border-navy-500 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-navy-900">JFK</div>
                  <div className="text-sm text-navy-600">John F. Kennedy</div>
                </button>
                
                <button
                  onClick={() => updateBookingData({ blade_airport: 'EWR' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    bookingData.blade_airport === 'EWR'
                      ? 'border-navy-500 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-navy-900">EWR</div>
                  <div className="text-sm text-navy-600">Newark Liberty</div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <h4 className="font-medium text-navy-900">Flight Information</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Flight Date"
                  type="date"
                  value={bookingData.blade_flight_date || ''}
                  onChange={(e) => {
                    setDateError(''); // Clear error when they change it
                    updateBookingData({ blade_flight_date: e.target.value });
                  }}
                  min={(() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toISOString().split('T')[0];
                  })()}
                  error={dateError}
                  helper={!dateError ? "Select your flight date (must be tomorrow or call us)" : undefined}
                  required
                />
                
                <Input
                  label="Flight Departure Time"
                  type="time"
                  value={bookingData.blade_flight_time || ''}
                  onChange={(e) => {
                    setTimeError('');
                    updateBookingData({ blade_flight_time: e.target.value });
                  }}
                  error={timeError}
                  helper={!timeError ? "Select your departure time" : undefined}
                  required
                />
                
                {bookingData.blade_flight_time && !timeError && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Bags Ready Time:</strong> Your bags must be ready for pickup by{' '}
                      {parseInt(bookingData.blade_flight_time.split(':')[0]) < 13 ? '5:00 AM' : '10:00 AM'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <h4 className="font-medium text-navy-900">Number of Bags</h4>
            </CardHeader>
            <CardContent>
              <Input
                label="Bag Count"
                type="number"
                min={2}
                value={bookingData.blade_bag_count?.toString() || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 0) {
                    updateBookingData({ blade_bag_count: value });
                  }
                }}
                placeholder="Enter number of bags"
                helper="$75 per bag • $150 minimum for up to 2 bags"
              />
              
              {bookingData.blade_bag_count && bookingData.blade_bag_count < 2 && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    BLADE service requires a minimum of 2 bags
                  </p>
                </div>
              )}
              
              {bookingData.blade_bag_count && bookingData.blade_bag_count >= 2 && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Estimated Price:</strong> ${Math.max(bookingData.blade_bag_count * 75, 150)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm font-medium text-navy-900">Important Information:</p>
                <ul className="text-sm text-navy-700 space-y-2">
                  <li>• NYC to airport only (one-way service)</li>
                  <li>• Book by 8:00 PM the night before your flight</li>
                  <li>• 2-bag minimum required</li>
                  <li>• Overweight bags (over 50 lbs): $100 per bag upon pickup</li>
                  <li>• Wait time over 10 minutes: $50 per 30 minutes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!canContinue()}
          size="lg"
        >
          Continue to Date & Time →
        </Button>
      </div>
    </div>
  );
}