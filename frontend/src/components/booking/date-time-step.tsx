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
    same_day_delivery_dollars: number;
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
    },
    enabled: bookingData.service_type !== 'blade_transfer'
  });

  const pricingMutation = useMutation({
    mutationFn: async (): Promise<PricingPreview> => {
      const payload: any = {
        service_type: bookingData.service_type,
        pickup_date: bookingData.service_type === 'blade_transfer' 
          ? bookingData.blade_flight_date 
          : selectedDate,
      };

      if (bookingData.service_type === 'blade_transfer') {
        payload.blade_airport = bookingData.blade_airport;
        payload.blade_flight_date = bookingData.blade_flight_date;
        payload.blade_flight_time = bookingData.blade_flight_time;
        payload.blade_bag_count = bookingData.blade_bag_count;
      } else if (bookingData.service_type === 'mini_move') {
        payload.mini_move_package_id = bookingData.mini_move_package_id;
        payload.include_packing = bookingData.include_packing;
        payload.include_unpacking = bookingData.include_unpacking;
        payload.pickup_time = selectedTime;
        payload.specific_pickup_hour = selectedTime === 'morning_specific' ? specificHour : undefined;
        payload.coi_required = bookingData.coi_required || false;
      } else if (bookingData.service_type === 'standard_delivery') {
        payload.standard_delivery_item_count = bookingData.standard_delivery_item_count;
        payload.is_same_day_delivery = bookingData.is_same_day_delivery;
        payload.specialty_item_ids = bookingData.specialty_item_ids;
      } else if (bookingData.service_type === 'specialty_item') {
        payload.specialty_item_ids = bookingData.specialty_item_ids;
      }

      const response = await apiClient.post('/api/public/pricing-preview/', payload);
      return response.data;
    }
  });

  useEffect(() => {
    if (bookingData.service_type === 'blade_transfer') {
      if (bookingData.blade_airport && bookingData.blade_flight_date && 
          bookingData.blade_flight_time && bookingData.blade_bag_count) {
        pricingMutation.mutate();
      }
      return;
    }

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
      
      if (bookingData.service_type === 'blade_transfer' && pricingMutation.data.details?.ready_time) {
        updateBookingData({ blade_ready_time: pricingMutation.data.details.ready_time });
      }
    }
  }, [pricingMutation.data, updateBookingData]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    updateBookingData({ pickup_date: date });
    
    // Auto-trigger pricing for specialty items (no time selection needed)
    if (bookingData.service_type === 'specialty_item' && bookingData.specialty_item_ids?.length) {
      setTimeout(() => pricingMutation.mutate(), 100);
    }
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
    
    // Get the Sunday before or on the first day of month
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay(); // 0 = Sunday
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    // Get days until end of last week (Saturday)
    const endDate = new Date(lastDay);
    const lastDayOfWeek = endDate.getDay();
    const daysToAdd = 6 - lastDayOfWeek; // Days until Saturday
    endDate.setDate(endDate.getDate() + daysToAdd);
    
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const isCurrentMonth = d.getMonth() === month;
      const isPastDate = d < today;
      
      // Only include current month dates that aren't in the past
      if (isCurrentMonth && !isPastDate) {
        days.push(new Date(d));
      } else if (isCurrentMonth || !isPastDate) {
        // Include padding days from other months only if they're not past dates
        days.push(new Date(d));
      } else {
        // Push null for past dates to maintain grid structure
        days.push(null);
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
  const canContinue = bookingData.service_type === 'blade_transfer' 
    ? !!(pricingMutation.data?.pricing)
    : !!(selectedDate && selectedTime);

  if (bookingData.service_type === 'blade_transfer') {
    return (
      <div className="space-y-8">
        <Card variant="luxury" className="p-6">
          <CardContent className="p-0">
            <h3 className="text-lg font-medium text-navy-900 mb-6">BLADE Flight Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-navy-700">Airport:</span>
                <span className="font-semibold text-navy-900">
                  {bookingData.blade_airport === 'JFK' ? 'JFK International' : 'Newark Liberty (EWR)'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-navy-700">Flight Date:</span>
                <span className="font-semibold text-navy-900">
                  {bookingData.blade_flight_date && new Date(bookingData.blade_flight_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-navy-700">Flight Departure:</span>
                <span className="font-semibold text-navy-900">
                  {bookingData.blade_flight_time && new Date(`2000-01-01T${bookingData.blade_flight_time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-navy-700">Number of Bags:</span>
                <span className="font-semibold text-navy-900">{bookingData.blade_bag_count}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-900">Bags Ready Time:</span>
                    <span className="text-xl font-bold text-blue-900">
                      {pricingMutation.data?.details?.ready_time && 
                        new Date(`2000-01-01T${pricingMutation.data.details.ready_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      }
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    Your bags must be packed and ready for pickup at your NYC address by this time.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {pricingMutation.data?.pricing && (
          <Card variant="luxury" className="p-8">
            <CardContent className="p-0">
              <h3 className="text-lg font-medium text-navy-900 mb-6">Pricing Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">
                    {bookingData.blade_bag_count} bags × $75:
                  </span>
                  <span className="text-navy-900 font-semibold">${pricingMutation.data.pricing.base_price_dollars}</span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-navy-900">Total:</span>
                    <span className="text-xl font-bold text-navy-900">${pricingMutation.data.pricing.total_price_dollars}</span>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-800">
                    <strong>No surcharges!</strong> BLADE pricing is straightforward with no weekend, geographic, or time window fees.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card variant="default" className="p-6">
          <CardContent className="p-0">
            <div className="space-y-3">
              <p className="text-sm font-medium text-navy-900">Post-Service Charges (if applicable):</p>
              <ul className="text-sm text-navy-700 space-y-2">
                <li>• Overweight bags (over 50 lbs): $120 per bag</li>
                <li>• Wait time over 10 minutes: $50 per 30 minutes</li>
              </ul>
              <p className="text-xs text-navy-500 mt-2">
                These charges are assessed after service completion and are not included in the booking total.
              </p>
            </div>
          </CardContent>
        </Card>

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

  return (
    <div className="space-y-8">
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
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-4 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-navy-600 p-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-4">
          {getMonthDays().map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-16 md:h-20" />;
            }
            
            const dateStr = formatDate(date);
            const dayInfo = getDayInfo(date);
            const isSelected = selectedDate === dateStr;
            const hasSurcharge = dayInfo?.surcharges && dayInfo.surcharges.length > 0;
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

            return (
              <button
                key={dateStr}
                onClick={() => isCurrentMonth && handleDateSelect(dateStr)}
                disabled={!isCurrentMonth}
                className={`
                  p-2 md:p-4 text-sm md:text-base rounded-md border-2 transition-all 
                  h-16 md:h-20 flex flex-col items-center justify-center
                  ${!isCurrentMonth ? 'opacity-30 cursor-not-allowed' : ''}
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
                {hasSurcharge && isCurrentMonth && (
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

              {pricingMutation.data.pricing.same_day_delivery_dollars > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium">Same-Day Delivery:</span>
                  <span className="text-navy-900 font-semibold">+${pricingMutation.data.pricing.same_day_delivery_dollars}</span>
                </div>
              )}

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

      {selectedDate && bookingData.service_type !== 'blade_transfer' && (
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