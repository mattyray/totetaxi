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
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['calendar', 'availability'],
    queryFn: async (): Promise<{ availability: AvailabilityDay[] }> => {
      const response = await apiClient.get('/api/public/availability/');
      return response.data;
    }
  });

  // Get pricing preview when date/service changes
  const pricingMutation = useMutation({
    mutationFn: async (pricingData: any): Promise<PricingPreview> => {
      const response = await apiClient.post('/api/public/pricing-preview/', pricingData);
      return response.data;
    },
    onSuccess: (data) => {
      updateBookingData({ pricing_data: data.pricing });
    }
  });

  // Update pricing when date or service selection changes
  useEffect(() => {
    if (selectedDate && bookingData.service_type) {
      const pricingRequest: any = {
        service_type: bookingData.service_type,
        pickup_date: selectedDate,
      };

      // Add service-specific data
      if (bookingData.service_type === 'mini_move') {
        pricingRequest.mini_move_package_id = bookingData.mini_move_package_id;
        pricingRequest.coi_required = bookingData.coi_required;
        pricingRequest.include_packing = bookingData.include_packing;
        pricingRequest.include_unpacking = bookingData.include_unpacking;
      } else if (bookingData.service_type === 'standard_delivery') {
        pricingRequest.standard_delivery_item_count = bookingData.standard_delivery_item_count;
        pricingRequest.is_same_day_delivery = bookingData.is_same_day_delivery;
      } else if (bookingData.service_type === 'specialty_item') {
        pricingRequest.specialty_item_ids = bookingData.specialty_item_ids;
      }

      pricingMutation.mutate(pricingRequest);
    }
  }, [selectedDate, bookingData.service_type, bookingData.mini_move_package_id, bookingData.include_packing, bookingData.include_unpacking]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    updateBookingData({ pickup_date: date });
  };

  const handleTimeSelect = (time: PickupTime) => {
    setSelectedTime(time);
    updateBookingData({ pickup_time: time });
  };

  const handleContinue = () => {
    updateBookingData({
      pickup_date: selectedDate,
      pickup_time: selectedTime
    });
    nextStep();
  };

  const canContinue = selectedDate && selectedTime;

  // Generate calendar days (next 60 days)
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const availabilityMap = availability?.availability.reduce((acc, day) => {
    acc[day.date] = day;
    return acc;
  }, {} as Record<string, AvailabilityDay>) || {};

  const timeSlots: Array<{ value: PickupTime; label: string; description: string }> = [
    { value: 'morning', label: '8 AM - 11 AM', description: 'Best availability' },
    { value: 'afternoon', label: '12 PM - 3 PM', description: 'Popular choice' },
    { value: 'evening', label: '4 PM - 7 PM', description: 'Limited availability' },
  ];

  if (availabilityLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-navy-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={i} className="h-12 bg-navy-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div>
        <h3 className="text-lg font-medium text-navy-900 mb-4">Select Your Pickup Date</h3>
        <Card variant="elevated">
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-navy-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.slice(0, 42).map(date => {
                const dayInfo = availabilityMap[date];
                const isSelected = selectedDate === date;
                const isAvailable = dayInfo?.available !== false;
                const hasSurcharges = dayInfo?.surcharges?.length > 0;
                const dateObj = new Date(date);
                const isToday = date === new Date().toISOString().split('T')[0];
                
                return (
                  <button
                    key={date}
                    onClick={() => isAvailable && handleDateSelect(date)}
                    disabled={!isAvailable}
                    className={`
                      h-12 text-sm rounded-md relative transition-all
                      ${isSelected 
                        ? 'bg-navy-900 text-white' 
                        : isAvailable
                        ? 'bg-white border border-gray-200 hover:border-navy-300 hover:bg-navy-50'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                      ${isToday ? 'ring-2 ring-gold-500' : ''}
                      ${hasSurcharges && isAvailable ? 'border-orange-300 bg-orange-50' : ''}
                    `}
                  >
                    <span className="block">{dateObj.getDate()}</span>
                    {hasSurcharges && isAvailable && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4 text-xs text-navy-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-50 border border-orange-300 rounded mr-1"></div>
                <span>Surcharge applies</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Info */}
        {selectedDate && availabilityMap[selectedDate] && (
          <div className="mt-4">
            <Card variant="default" className="border-gold-200 bg-gold-50">
              <CardContent>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-navy-900">
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    {availabilityMap[selectedDate].surcharges?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-orange-700 font-medium">Additional charges apply:</p>
                        <ul className="text-sm text-orange-600">
                          {availabilityMap[selectedDate].surcharges.map((surcharge, index) => (
                            <li key={index}>• {surcharge.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className="text-sm text-navy-600">
                      {availabilityMap[selectedDate].capacity_used}/{availabilityMap[selectedDate].max_capacity} booked
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Select Pickup Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                onClick={() => handleTimeSelect(slot.value)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${selectedTime === slot.value
                    ? 'border-navy-900 bg-navy-50'
                    : 'border-gray-200 hover:border-navy-300'
                  }
                `}
              >
                <h4 className="font-medium text-navy-900">{slot.label}</h4>
                <p className="text-sm text-navy-600">{slot.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Preview */}
      {bookingData.pricing_data && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">Pricing Summary</h3>
          <Card variant="luxury">
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-navy-700">Base Price:</span>
                  <span className="font-medium">${bookingData.pricing_data.base_price_dollars}</span>
                </div>
                
                {bookingData.pricing_data.surcharge_dollars > 0 && (
                  <div className="flex justify-between">
                    <span className="text-navy-700">Date Surcharges:</span>
                    <span className="font-medium">+${bookingData.pricing_data.surcharge_dollars}</span>
                  </div>
                )}
                
                {bookingData.pricing_data.coi_fee_dollars > 0 && (
                  <div className="flex justify-between">
                    <span className="text-navy-700">COI Fee:</span>
                    <span className="font-medium">+${bookingData.pricing_data.coi_fee_dollars}</span>
                  </div>
                )}
                
                {bookingData.pricing_data.organizing_total_dollars > 0 && (
                  <div className="flex justify-between">
                    <span className="text-navy-700">Organizing Services:</span>
                    <span className="font-medium">+${bookingData.pricing_data.organizing_total_dollars}</span>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-navy-900">Total:</span>
                  <span className="text-navy-900">${bookingData.pricing_data.total_price_dollars}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* COI Option */}
      {bookingData.service_type === 'mini_move' && (
        <div>
          <Card variant="default">
            <CardContent>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={bookingData.coi_required || false}
                  onChange={(e) => updateBookingData({ coi_required: e.target.checked })}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-navy-900">
                    Certificate of Insurance (COI) Required
                  </span>
                  <p className="text-sm text-navy-600 mt-1">
                    Required by some buildings. We'll handle the paperwork for you.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Continue Button */}
      {canContinue && (
        <div className="flex justify-end">
          <Button 
            variant="primary" 
            onClick={handleContinue}
            disabled={pricingMutation.isPending}
          >
            {pricingMutation.isPending ? 'Calculating...' : 'Continue to Addresses →'}
          </Button>
        </div>
      )}
    </div>
  );
}