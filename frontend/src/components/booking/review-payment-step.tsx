'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BookingResponse {
  message: string;
  booking: {
    id: string;
    booking_number: string;
    total_price_dollars: number;
  };
}

export function ReviewPaymentStep() {
  const { bookingData, resetWizard, setLoading, isLoading } = useBookingWizard();
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string>('');

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (): Promise<BookingResponse> => {
      const bookingRequest = {
        // Customer info
        first_name: bookingData.customer_info?.first_name,
        last_name: bookingData.customer_info?.last_name,
        email: bookingData.customer_info?.email,
        phone: bookingData.customer_info?.phone,
        
        // Service selection
        service_type: bookingData.service_type,
        mini_move_package_id: bookingData.mini_move_package_id,
        include_packing: bookingData.include_packing,
        include_unpacking: bookingData.include_unpacking,
        standard_delivery_item_count: bookingData.standard_delivery_item_count,
        is_same_day_delivery: bookingData.is_same_day_delivery,
        specialty_item_ids: bookingData.specialty_item_ids,
        
        // Date and time
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        
        // Addresses
        pickup_address: bookingData.pickup_address,
        delivery_address: bookingData.delivery_address,
        
        // Additional info
        special_instructions: bookingData.special_instructions,
        coi_required: bookingData.coi_required,
      };

      const response = await apiClient.post('/api/public/guest-booking/', bookingRequest);
      return response.data;
    },
    onSuccess: (data) => {
      setBookingNumber(data.booking.booking_number);
      setBookingComplete(true);
      setLoading(false);
      
      // In a real app, you'd redirect to payment processing here
      // For now, we'll just show success
    },
    onError: (error) => {
      setLoading(false);
      console.error('Booking creation failed:', error);
    }
  });

  const handleSubmitBooking = () => {
    setLoading(true);
    createBookingMutation.mutate();
  };

  const handleStartOver = () => {
    resetWizard();
    setBookingComplete(false);
    setBookingNumber('');
  };

  if (bookingComplete) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">✅</div>
        
        <Card variant="luxury">
          <CardContent>
            <h3 className="text-2xl font-serif font-bold text-navy-900 mb-4">
              Booking Confirmed!
            </h3>
            
            <div className="space-y-3">
              <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                <span className="text-sm text-gold-700">Your Booking Number</span>
                <div className="text-2xl font-bold text-navy-900">{bookingNumber}</div>
              </div>
              
              <p className="text-navy-700">
                Your luxury move is confirmed. We'll send a confirmation email to{' '}
                <strong>{bookingData.customer_info?.email}</strong> with all the details.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <span className="font-medium text-navy-900">Pickup:</span>
                  <p className="text-navy-700">
                    {new Date(bookingData.pickup_date!).toLocaleDateString()} at{' '}
                    {bookingData.pickup_time === 'morning' ? '8-11 AM' : 
                     bookingData.pickup_time === 'afternoon' ? '12-3 PM' : '4-7 PM'}
                  </p>
                  <p className="text-navy-600">
                    {bookingData.pickup_address?.address_line_1}, {bookingData.pickup_address?.city}
                  </p>
                </div>
                
                <div className="text-left">
                  <span className="font-medium text-navy-900">Total:</span>
                  <p className="text-2xl font-bold text-navy-900">
                    ${bookingData.pricing_data?.total_price_dollars}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h4 className="text-lg font-medium text-navy-900">What's Next?</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Card variant="default">
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl mb-2">📧</div>
                  <h5 className="font-medium text-navy-900 mb-1">Confirmation Email</h5>
                  <p className="text-navy-600">Check your email for booking details and our team contact info.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card variant="default">
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl mb-2">📞</div>
                  <h5 className="font-medium text-navy-900 mb-1">Coordination Call</h5>
                  <p className="text-navy-600">We'll call 24 hours before pickup to confirm timing.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card variant="default">
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl mb-2">🚛</div>
                  <h5 className="font-medium text-navy-900 mb-1">White Glove Service</h5>
                  <p className="text-navy-600">Our professional team handles everything with care.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={handleStartOver}>
            Book Another Move
          </Button>
          <Button variant="primary" onClick={() => window.location.href = '/'}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card variant="luxury">
        <CardHeader>
          <h3 className="text-xl font-serif font-bold text-navy-900">Booking Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Service Details */}
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Service</h4>
              <p className="text-navy-700">
                {bookingData.service_type === 'mini_move' && 'Mini Move'}
                {bookingData.service_type === 'standard_delivery' && 'Standard Delivery'}
                {bookingData.service_type === 'specialty_item' && 'Specialty Items'}
              </p>
              
              {bookingData.include_packing && (
                <p className="text-sm text-navy-600">+ Professional Packing</p>
              )}
              {bookingData.include_unpacking && (
                <p className="text-sm text-navy-600">+ Professional Unpacking</p>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Pickup Schedule</h4>
              <p className="text-navy-700">
                {new Date(bookingData.pickup_date!).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-navy-600">
                {bookingData.pickup_time === 'morning' && '8:00 AM - 11:00 AM'}
                {bookingData.pickup_time === 'afternoon' && '12:00 PM - 3:00 PM'}
                {bookingData.pickup_time === 'evening' && '4:00 PM - 7:00 PM'}
              </p>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Pickup Address</h4>
                <p className="text-navy-700 text-sm">
                  {bookingData.pickup_address?.address_line_1}
                  {bookingData.pickup_address?.address_line_2 && (
                    <br />{bookingData.pickup_address.address_line_2}
                  )}
                  <br />{bookingData.pickup_address?.city}, {bookingData.pickup_address?.state} {bookingData.pickup_address?.zip_code}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Delivery Address</h4>
                <p className="text-navy-700 text-sm">
                  {bookingData.delivery_address?.address_line_1}
                  {bookingData.delivery_address?.address_line_2 && (
                    <br />{bookingData.delivery_address.address_line_2}
                  )}
                  <br />{bookingData.delivery_address?.city}, {bookingData.delivery_address?.state} {bookingData.delivery_address?.zip_code}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Contact Information</h4>
              <p className="text-navy-700">
                {bookingData.customer_info?.first_name} {bookingData.customer_info?.last_name}
                <br />{bookingData.customer_info?.email}
                <br />{bookingData.customer_info?.phone}
              </p>
            </div>

            {/* Special Instructions */}
            {bookingData.special_instructions && (
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Special Instructions</h4>
                <p className="text-navy-700 text-sm bg-gray-50 p-3 rounded">
                  {bookingData.special_instructions}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      {bookingData.pricing_data && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-xl font-serif font-bold text-navy-900">Pricing</h3>
          </CardHeader>
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
              
              <div className="flex justify-between text-xl font-bold">
                <span className="text-navy-900">Total:</span>
                <span className="text-navy-900">${bookingData.pricing_data.total_price_dollars}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Notice */}
      <Card variant="default" className="border-gold-200 bg-gold-50">
        <CardContent>
          <div className="text-center">
            <h4 className="font-medium text-navy-900 mb-2">Payment</h4>
            <p className="text-navy-700 text-sm">
              For this demo, we'll create your booking without payment processing. 
              In production, this would integrate with Stripe for secure payment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          variant="primary" 
          size="lg"
          onClick={handleSubmitBooking}
          disabled={isLoading || createBookingMutation.isPending}
        >
          {isLoading || createBookingMutation.isPending ? 'Creating Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}