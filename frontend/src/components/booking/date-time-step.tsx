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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: availability } = useQuery({
    queryKey: ['availability', 'calendar'],
    queryFn: async () => {
      const response = await apiClient.get('/api/public/availability/');
      return response.data.availability as AvailabilityDay[];
    }
  });

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

  useEffect(() => {
    if (selectedDate && bookingData.service_type) {
      if (bookingData.service_type === 'mini_move' && !bookingData.mini_move_package_id) {
        return;
      }
      if (bookingData.service_type === 'standard_delivery' && !bookingData.standard_delivery_item_count) {
        return;
      }
      if (bookingData.service_type === 'specialty_item' && (!bookingData.specialty_item_ids || bookingData.specialty_item_ids.length === 0)) {
        return;
      }
      
      pricingMutation.mutate();
    }
  }, [selectedDate, selectedTime, specificHour, bookingData.service_type, bookingData.mini_move_package_id, bookingData.standard_delivery_item_count, bookingData.specialty_item_ids]);

  useEffect(() => {
    if (pricingMutation.data?.pricing) {
      updateBookingData({ pricing_data: pricingMutation.data.pricing });
    }
  }, [pricingMutation.data, updateBookingData]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    updateBookingData({ pickup_date: date });
  };

  const handleTimeSelect = (time: PickupTime) => {
    setSelectedTime(time);
    const newHour = time === 'morning_specific' ? specificHour : undefined;
    
    updateBookingData({ 
      pickup_time: time,
      specific_pickup_hour: newHour
    });
    
    if (selectedDate && bookingData.service_type) {
      setTimeout(() => pricingMutation.mutate(), 100);
    }
  };

  const handleSpecificHourSelect = (hour: number) => {
    setSpecificHour(hour);
    updateBookingData({ specific_pickup_hour: hour });
    
    if (selectedDate && bookingData.service_type && selectedTime === 'morning_specific') {
      setTimeout(() => pricingMutation.mutate(), 100);
    }
  };

  const handleContinue = () => {
    if (pricingMutation.data?.pricing) {
      updateBookingData({ pricing_data: pricingMutation.data.pricing });
    }
    nextStep();
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (d >= today) {
        days.push(new Date(d));
      }
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

  const getPackageType = () => {
    if (bookingData.service_type !== 'mini_move' || !bookingData.mini_move_package_id) {
      return null;
    }
    return bookingData.package_type;
  };

  const packageType = getPackageType();
  const canContinue = selectedDate && selectedTime;

  return (
    <div className="space-y-8">
      {/* Calendar Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => {
              const prev = new Date(currentMonth);
              prev.setMonth(prev.getMonth() - 1);
              const today = new Date();
              if (prev.getFullYear() > today.getFullYear() || 
                  (prev.getFullYear() === today.getFullYear() && prev.getMonth() >= today.getMonth())) {
                setCurrentMonth(prev);
              }
            }}
            disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
          >
            ← Previous
          </Button>
          <h3 className="text-xl font-medium text-navy-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <Button 
            variant="outline" 
            onClick={() => {
              const next = new Date(currentMonth);
              next.setMonth(next.getMonth() + 1);
              setCurrentMonth(next);
            }}
          >
            Next →
          </Button>
        </div>

        <h3 className="text-lg font-medium text-navy-900 mb-6">Select Date</h3>
        
        {/* Responsive Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-4">
          {getMonthDays().map((date) => {
            const dateStr = formatDate(date);
            const dayInfo = getDayInfo(date);
            const isSelected = selectedDate === dateStr;
            const hasSurcharge = dayInfo?.surcharges && dayInfo.surcharges.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => handleDateSelect(dateStr)}
                className={`
                  p-2 md:p-4 text-sm md:text-base rounded-md border-2 transition-all 
                  h-16 md:h-20 flex flex-col items-center justify-center
                  ${isSelected 
                    ? 'bg-navy-900 text-white border-navy-900' 
                    : 'bg-white text-navy-900 border-gray-200 hover:border-navy-300 hover:bg-navy-50'
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
        
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-100 rounded mr-2"></div>
            <span className="text-sm text-navy-600">Weekend surcharge applies</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <Card variant="default" className="p-6">
          <CardContent className="p-0">
            <div className="text-center">
              <h4 className="font-medium text-navy-900 mb-2">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              {getDayInfo(new Date(selectedDate + 'T00:00:00'))?.surcharges
                ?.filter((surcharge) => {
                  if (bookingData.service_type === 'mini_move') {
                    return surcharge.description.includes('Mini Move');
                  } else if (bookingData.service_type === 'standard_delivery') {
                    return surcharge.description.includes('Standard Delivery');
                  }
                  return true;
                })
                .map((surcharge, index) => (
                  <div key={index} className="mt-2 text-sm text-orange-600">
                    <strong>Weekend surcharge applies:</strong>
                    <br />• {surcharge.description}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-6">Select Pickup Time</h3>
          <div className="space-y-4">
            
            <button
              onClick={() => handleTimeSelect('morning')}
              className={`w-full p-6 rounded-lg border-2 text-left transition-all ${
                selectedTime === 'morning'
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-navy-900">Morning (8 AM - 11 AM)</div>
              <div className="text-sm text-navy-600">Standard 3-hour pickup window</div>
            </button>

            {packageType === 'petite' && (
              <button
                onClick={() => handleTimeSelect('no_time_preference')}
                className={`w-full p-6 rounded-lg border-2 text-left transition-all ${
                  selectedTime === 'no_time_preference'
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-navy-900">Flexible Morning Timing</div>
                <div className="text-sm text-navy-600">8-11 AM pickup window - we'll coordinate the exact time with you</div>
              </button>
            )}

            {(packageType === 'standard' || packageType === 'full') && (
              <div
                className={`p-6 rounded-lg border-2 transition-all ${
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
                      <span className="text-orange-600 ml-2">(+$175)</span>
                    )}
                    {packageType === 'full' && (
                      <span className="text-green-600 ml-2">(Free)</span>
                    )}
                  </div>
                  <div className="text-sm text-navy-600">Choose your preferred hour</div>
                </button>
                
                {selectedTime === 'morning_specific' && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[8, 9, 10].map((hour) => (
                      <button
                        key={hour}
                        onClick={() => handleSpecificHourSelect(hour)}
                        className={`p-3 text-sm rounded border-2 transition-all ${
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

      {pricingMutation.data?.pricing && (
        <Card variant="luxury" className="p-8">
          <CardContent className="p-0">
            <h3 className="text-lg font-medium text-navy-900 mb-6">Pricing Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-navy-900 font-medium">Base Price:</span>
                <span className="text-navy-900 font-semibold">${pricingMutation.data.pricing.base_price_dollars}</span>
              </div>

              {pricingMutation.data.pricing.surcharge_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Weekend Surcharge:</span>
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
                  <span className="text-navy-900 font-medium">Tax (8.75%):</span>
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

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-navy-900">Total:</span>
                  <span className="text-xl font-bold text-navy-900">${pricingMutation.data.pricing.total_price_dollars}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <Card variant="default" className="p-6">
          <CardContent className="p-0">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookingData.coi_required || false}
                onChange={(e) => updateBookingData({ coi_required: e.target.checked })}
                className="mr-3 h-4 w-4"
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