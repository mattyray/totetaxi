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
    total_price_dollars: number;
  };
  details: any;
  pickup_date: string;
}

type PickupTime = 'morning' | 'afternoon' | 'evening';

export function DateTimeStep() {
  const { bookingData, updateBookingData, nextStep } = useBookingWizard();
  const [selectedDate, setSelectedDate] = useState<string>(bookingData.pickup_date || '');
  const [selectedTime, setSelectedTime] = useState<PickupTime>(bookingData.pickup_time || 'morning');

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
        coi_required: bookingData.coi_required || false
      });
      return response.data;
    }
  });

  // Update pricing when date/service changes
  useEffect(() => {
    if (selectedDate && bookingData.service_type) {
      pricingMutation.mutate();
    }
  }, [selectedDate, bookingData.service_type, bookingData.mini_move_package_id, bookingData.include_packing, bookingData.include_unpacking, bookingData.standard_delivery_item_count, bookingData.is_same_day_delivery]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    updateBookingData({ pickup_date: date });
  };

  const handleTimeSelect = (time: PickupTime) => {
    setSelectedTime(time);
    updateBookingData({ pickup_time: time });
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

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Pickup Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleTimeSelect('morning')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                selectedTime === 'morning'
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-navy-900">8 AM - 11 AM</div>
              <div className="text-sm text-navy-600">Best availability</div>
            </button>

            <button
              onClick={() => handleTimeSelect('afternoon')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                selectedTime === 'afternoon'
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-navy-900">12 PM - 3 PM</div>
              <div className="text-sm text-navy-600">Popular choice</div>
            </button>

            <button
              onClick={() => handleTimeSelect('evening')}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                selectedTime === 'evening'
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-navy-900">4 PM - 7 PM</div>
              <div className="text-sm text-navy-600">Limited availability</div>
            </button>
          </div>
        </div>
      )}

      {/* FIXED: Pricing Summary with dark text */}
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
                <span className="font-medium text-navy-900">Certificate of Insurance (COI) Required</span>
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