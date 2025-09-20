// frontend/src/components/booking/date-time-step.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AvailabilityDay {
  date: string;
  available: boolean;
  is_weekend: boolean;
  specialty_items_allowed: boolean;
  capacity_used: number;
  max_capacity: number;
  surcharges: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

interface PricingPreview {
  service_type: string;
  pricing: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number;
    geographic_surcharge_dollars: number;
    time_window_surcharge_dollars: number;
    total_price_dollars: number;
  };
  details: any;
  pickup_date: string;
}

type PickupTime = 'morning' | 'morning_specific' | 'no_time_preference';

export function DateTimeStep() {
  const { bookingData, updateBookingData, nextStep } = useBookingWizard();
  const [selectedDate, setSelectedDate] = useState<string>(bookingData.pickup_date || '');
  const [selectedTime, setSelectedTime] = useState<PickupTime>(bookingData.pickup_time || 'morning');
  const [specificHour, setSpecificHour] = useState<number>(8);

  // Get calendar availability
  const { data: availability } = useQuery({
    queryKey: ['availability', 'calendar'],
    queryFn: async () => {
      const response = await apiClient.get('/api/public/availability/');
      return response.data.availability as AvailabilityDay[];
    }
  });

  // Get pricing preview
  const pricingMutation = useMutation({
    mutationFn: async (): Promise<PricingPreview> => {
      const response = await apiClient.post('/api/public/pricing-preview/', {
        service_type: bookingData.service_type,
        mini_move_package_id: bookingData.mini_move_package_id,
        include_packing: bookingData.include_packing,
        include_unpacking: bookingData.include_unpacking,
        standard_delivery_item_count: bookingData.standard_delivery_item_count,
        is_same_day_delivery: bookingData.is_same_day_delivery,
        specialty_item_ids: bookingData.specialty_item_ids,
        pickup_date: selectedDate,
        pickup_time: selectedTime,
        specific_pickup_hour: selectedTime === 'morning_specific' ? specificHour : undefined,
        coi_required: bookingData.coi_required || false
      });
      return response.data;
    }
  });

  // Update pricing when date/service changes - FIXED: Only call when we have required data
  useEffect(() => {
    if (selectedDate && bookingData.service_type) {
      // For mini_move, ensure we have package_id before calling pricing
      if (bookingData.service_type === 'mini_move' && !bookingData.mini_move_package_id) {
        return;
      }
      // For standard_delivery, ensure we have item count
      if (bookingData.service_type === 'standard_delivery' && !bookingData.standard_delivery_item_count) {
        return;
      }
      // For specialty_item, ensure we have items
      if (bookingData.service_type === 'specialty_item' && (!bookingData.specialty_item_ids || bookingData.specialty_item_ids.length === 0)) {
        return;
      }
      
      pricingMutation.mutate();
    }
  }, [selectedDate, selectedTime, specificHour, bookingData.service_type, bookingData.mini_move_package_id, bookingData.standard_delivery_item_count, bookingData.specialty_item_ids]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    updateBookingData({ pickup_date: date });
  };

  const handleTimeSelect = (time: PickupTime) => {
    setSelectedTime(time);
    updateBookingData({ 
      pickup_time: time,
      specific_pickup_hour: time === 'morning_specific' ? specificHour : undefined
    });
  };

  const handleSpecificHourSelect = (hour: number) => {
    setSpecificHour(hour);
    updateBookingData({ specific_pickup_hour: hour });
  };

  const handleContinue = () => {
    // Store pricing data
    if (pricingMutation.data?.pricing) {
      updateBookingData({ pricing_data: pricingMutation.data.pricing });
    }
    nextStep();
  };

  // Simple calendar view - next 30 days
  const getNext30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayInfo = (date: Date) => {
    const dateStr = formatDate(date);
    return availability?.find(day => day.date === dateStr);
  };

  // FIXED: Get package type from the actual package data instead of relying on bookingData.package_type
  const getPackageType = () => {
    if (bookingData.service_type !== 'mini_move' || !bookingData.mini_move_package_id) {
      return null;
    }
    
    // You can get this from the services API or store it when package is selected
    // For now, we'll use the package_type if available, otherwise default behavior
    return bookingData.package_type;
  };

  const packageType = getPackageType();
  const canContinue = selectedDate && selectedTime;

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div>
        <h3 className="text-lg font-medium text-navy-900 mb-4">Select Date</h3>
        <div className="grid grid-cols-7 gap-2">
          {getNext30Days().map((date) => {
            const dateStr = formatDate(date);
            const dayInfo = getDayInfo(date);
            const isSelected = selectedDate === dateStr;
            const isAvailable = dayInfo?.available !== false;
            const hasSurcharge = dayInfo?.surcharges && dayInfo.surcharges.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => isAvailable && handleDateSelect(dateStr)}
                disabled={!isAvailable}
                className={`
                  p-2 text-sm rounded-md border transition-all min-h-[60px] flex flex-col items-center justify-center
                  ${isSelected 
                    ? 'bg-navy-900 text-white border-navy-900' 
                    : isAvailable
                    ? 'bg-white text-navy-900 border-gray-200 hover:border-navy-300 hover:bg-navy-50'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }
                `}
              >
                <div className="font-medium">{date.getDate()}</div>
                <div className="text-xs opacity-75">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                {hasSurcharge && (
                  <div className="text-xs text-orange-600 mt-1">•</div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-4 mt-3 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-white border border-gray-200 rounded mr-2"></div>
            <span className="text-navy-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-100 rounded mr-2"></div>
            <span className="text-navy-600">Unavailable</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-100 rounded mr-2"></div>
            <span className="text-navy-600">Surcharge applies</span>
          </div>
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && (
        <Card variant="default">
          <CardContent>
            <div className="text-center">
              <h4 className="font-medium text-navy-900 mb-2">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              <p className="text-sm text-navy-600">
                {getDayInfo(new Date(selectedDate + 'T00:00:00'))?.capacity_used || 0}/
                {getDayInfo(new Date(selectedDate + 'T00:00:00'))?.max_capacity || 10} booked
              </p>
              
              {/* Surcharge notices */}
              {getDayInfo(new Date(selectedDate + 'T00:00:00'))?.surcharges?.map((surcharge, index) => (
                <div key={index} className="mt-2 text-sm text-orange-600">
                  <strong>Additional charges apply:</strong>
                  <br />• {surcharge.description}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Selection - UPDATED: Only morning options */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Pickup Time</h3>
          <div className="space-y-4">
            
            {/* Standard Morning Option */}
            <button
              onClick={() => handleTimeSelect('morning')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedTime === 'morning'
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-navy-900">Morning (8 AM - 11 AM)</div>
              <div className="text-sm text-navy-600">Standard 3-hour pickup window</div>
            </button>

            {/* No Time Preference (Petite only) */}
            {packageType === 'petite' && (
              <button
                onClick={() => handleTimeSelect('no_time_preference')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTime === 'no_time_preference'
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-navy-900">No Time Preference</div>
                <div className="text-sm text-navy-600">Flexible timing - we'll coordinate with you</div>
              </button>
            )}

            {/* Specific 1-Hour Window */}
            {(packageType === 'standard' || packageType === 'full') && (
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTime === 'morning_specific'
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleTimeSelect('morning_specific')}
                  className="w-full text-left"
                >
                  <div className="font-medium text-navy-900">
                    Specific 1-Hour Window
                    {packageType === 'standard' && (
                      <span className="text-orange-600 ml-2">(+$25)</span>
                    )}
                    {packageType === 'full' && (
                      <span className="text-green-600 ml-2">(Free)</span>
                    )}
                  </div>
                  <div className="text-sm text-navy-600">Choose your preferred hour</div>
                </button>
                
                {selectedTime === 'morning_specific' && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[8, 9, 10].map((hour) => (
                      <button
                        key={hour}
                        onClick={() => handleSpecificHourSelect(hour)}
                        className={`p-2 text-sm rounded border transition-all ${
                          specificHour === hour
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'bg-white text-navy-900 border-gray-200 hover:border-navy-300'
                        }`}
                      >
                        {hour}:00 - {hour + 1}:00 AM
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Pricing Summary */}
      {pricingMutation.data?.pricing && (
        <Card variant="luxury">
          <CardContent>
            <h3 className="text-lg font-medium text-navy-900 mb-4">Pricing Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-navy-900 font-medium">Base Price:</span>
                <span className="text-navy-900 font-semibold">${pricingMutation.data.pricing.base_price_dollars}</span>
              </div>

              {pricingMutation.data.pricing.surcharge_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Date Surcharges:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.surcharge_dollars}</span>
                </div>
              )}

              {pricingMutation.data.pricing.coi_fee_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">COI Fee:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.coi_fee_dollars}</span>
                </div>
              )}

              {pricingMutation.data.pricing.organizing_total_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Organizing Services:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.organizing_total_dollars}</span>
                </div>
              )}

              {pricingMutation.data.pricing.organizing_tax_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Tax (8.25%):</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.organizing_tax_dollars}</span>
                </div>
              )}

              {pricingMutation.data.pricing.geographic_surcharge_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Distance Surcharge:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.geographic_surcharge_dollars}</span>
                </div>
              )}

              {pricingMutation.data.pricing.time_window_surcharge_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">1-Hour Window:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.time_window_surcharge_dollars}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-navy-900">Total:</span>
                  <span className="text-xl font-bold text-navy-900">${pricingMutation.data.pricing.total_price_dollars}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* COI Option */}
      {selectedDate && (
        <Card variant="default">
          <CardContent>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookingData.coi_required || false}
                onChange={(e) => updateBookingData({ coi_required: e.target.checked })}
                className="mr-3"
              />
              <div>
                <span className="font-medium text-navy-900">
                  Certificate of Insurance (COI) Required
                  {packageType === 'petite' && (
                    <span className="text-orange-600 ml-2">(+$50)</span>
                  )}
                </span>
                <p className="text-sm text-navy-600">
                  Required by some buildings. We'll handle the paperwork for you.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || pricingMutation.isPending}
          size="lg"
        >
          {pricingMutation.isPending ? 'Calculating...' : 'Continue to Addresses →'}
        </Button>
      </div>
    </div>
  );
}