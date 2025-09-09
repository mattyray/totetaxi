'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ServiceCatalog } from '@/types';

export function ServiceSelectionStep() {
  const { bookingData, updateBookingData, nextStep } = useBookingWizard();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  const handleMiniMoveSelect = (packageId: string, packageData: any) => {
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
      (bookingData.service_type === 'standard_delivery' && bookingData.standard_delivery_item_count) ||
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
                ? 'border-navy-900 bg-navy-50'
                : 'border-gray-200 hover:border-navy-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-1">Mini Moves</h4>
            <p className="text-sm text-navy-600">Complete packages for seasonal relocation</p>
          </button>
          
          <button
            onClick={() => updateBookingData({ service_type: 'standard_delivery' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'standard_delivery'
                ? 'border-navy-900 bg-navy-50'
                : 'border-gray-200 hover:border-navy-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-1">Standard Delivery</h4>
            <p className="text-sm text-navy-600">Individual items, priced per piece</p>
          </button>
          
          <button
            onClick={() => updateBookingData({ service_type: 'specialty_item' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              bookingData.service_type === 'specialty_item'
                ? 'border-navy-900 bg-navy-50'
                : 'border-gray-200 hover:border-navy-300'
            }`}
          >
            <h4 className="font-medium text-navy-900 mb-1">Specialty Items</h4>
            <p className="text-sm text-navy-600">Pelotons, surfboards, and more</p>
          </button>
        </div>
      </div>

      {/* Mini Move Packages */}
      {bookingData.service_type === 'mini_move' && services?.mini_move_packages && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Your Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.mini_move_packages.map((pkg) => (
              <Card 
                key={pkg.id}
                variant={pkg.is_most_popular ? "luxury" : "elevated"}
                className={`cursor-pointer transition-all relative ${
                  bookingData.mini_move_package_id === pkg.id 
                    ? 'ring-2 ring-navy-900' 
                    : 'hover:shadow-xl'
                }`}
                onClick={() => handleMiniMoveSelect(pkg.id, pkg)}
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
                  
                  <ul className="space-y-2">
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Organizing Services Add-ons */}
          {bookingData.mini_move_package_id && (
            <div className="mt-6 p-6 bg-gold-50 border border-gold-200 rounded-lg">
              <h4 className="text-lg font-medium text-navy-900 mb-4">
                Add Professional Organizing Services
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center p-4 border border-gold-300 rounded-lg cursor-pointer hover:bg-gold-100">
                  <input
                    type="checkbox"
                    checked={bookingData.include_packing || false}
                    onChange={(e) => handleOrganizingServiceToggle('packing', e.target.checked)}
                    className="mr-3"
                  />
                  <div>
                    <h5 className="font-medium text-navy-900">Professional Packing</h5>
                    <p className="text-sm text-navy-600">Includes supplies and expert packing</p>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border border-gold-300 rounded-lg cursor-pointer hover:bg-gold-100">
                  <input
                    type="checkbox"
                    checked={bookingData.include_unpacking || false}
                    onChange={(e) => handleOrganizingServiceToggle('unpacking', e.target.checked)}
                    className="mr-3"
                  />
                  <div>
                    <h5 className="font-medium text-navy-900">Professional Unpacking</h5>
                    <p className="text-sm text-navy-600">Expert organizing at destination</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard Delivery */}
      {bookingData.service_type === 'standard_delivery' && services?.standard_delivery && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Standard Delivery Details</h3>
          <Card variant="elevated">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-900 mb-2">
                    Number of Items
                  </label>
                  <input
                    type="number"
                    min={services.standard_delivery.minimum_items}
                    value={bookingData.standard_delivery_item_count || ''}
                    onChange={(e) => updateBookingData({ 
                      standard_delivery_item_count: parseInt(e.target.value) || undefined 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                    placeholder={`Minimum ${services.standard_delivery.minimum_items} items`}
                  />
                  <p className="text-sm text-navy-600 mt-1">
                    ${services.standard_delivery.price_per_item_dollars} per item • 
                    ${services.standard_delivery.minimum_charge_dollars} minimum
                  </p>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bookingData.is_same_day_delivery || false}
                    onChange={(e) => updateBookingData({ is_same_day_delivery: e.target.checked })}
                    className="mr-3"
                  />
                  <span className="text-navy-900">
                    Same-Day Delivery (+${services.standard_delivery.same_day_flat_rate_dollars})
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Specialty Items */}
      {bookingData.service_type === 'specialty_item' && services?.specialty_items && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Specialty Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.specialty_items.map((item) => (
              <label 
                key={item.id}
                className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
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
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-navy-900">{item.name}</h5>
                      <p className="text-sm text-navy-600">{item.description}</p>
                    </div>
                    <span className="text-lg font-bold text-navy-900">
                      ${item.price_dollars}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      {canContinue() && (
        <div className="flex justify-end mt-6">
          <Button variant="primary" onClick={nextStep}>
            Continue to Date & Time →
          </Button>
        </div>
      )}
    </div>
  );
}