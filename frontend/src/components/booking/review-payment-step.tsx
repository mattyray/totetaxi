'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';

interface BookingResponse {
  message: string;
  booking: {
    id: string;
    booking_number: string;
    total_price_dollars: number;
  };
}

// FIXED: Helper function to get time display
function getTimeDisplay(pickupTime: string | undefined, specificHour?: number) {
  switch (pickupTime) {
    case 'morning':
      return '8:00 AM - 11:00 AM';
    case 'morning_specific':
      return specificHour ? `${specificHour}:00 AM - ${specificHour + 1}:00 AM` : '8:00 AM - 11:00 AM';
    case 'no_time_preference':
      return 'Flexible timing - we\'ll coordinate with you';
    default:
      return '8:00 AM - 11:00 AM';
  }
}

export function ReviewPaymentStep() {
  const { bookingData, resetWizard, setLoading, isLoading, setBookingComplete } = useBookingWizard();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [bookingComplete, setBookingCompleteLocal] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (): Promise<BookingResponse> => {
      // Use correct endpoint based on authentication status
      const endpoint = isAuthenticated 
        ? '/api/customer/bookings/create/'     // Updates customer stats
        : '/api/public/guest-booking/';        // Guest booking

      console.log(`Creating ${isAuthenticated ? 'authenticated' : 'guest'} booking at:`, endpoint);

      let bookingRequest;

      if (isAuthenticated) {
        // Generate unique nicknames with timestamp
        const timestamp = new Date().toISOString().slice(11, 16); // HH:MM format
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Authenticated booking format - different structure
        bookingRequest = {
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
          
          // Addresses - use new_pickup_address format for authenticated users
          new_pickup_address: bookingData.pickup_address,
          new_delivery_address: bookingData.delivery_address,
          save_pickup_address: true,  // Save addresses for future use
          save_delivery_address: true,
          pickup_address_nickname: `Pickup ${dateStr} ${timestamp}`,  // Unique nickname
          delivery_address_nickname: `Delivery ${dateStr} ${timestamp}`, // Unique nickname
          
          // Additional info
          special_instructions: bookingData.special_instructions,
          coi_required: bookingData.coi_required,
          create_payment_intent: false, // Disable for demo
        };
      } else {
        // Guest booking format - original structure
        bookingRequest = {
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
      }

      const response = await apiClient.post(endpoint, bookingRequest);
      return response.data;
    },
    onSuccess: (data) => {
      setBookingNumber(data.booking.booking_number);
      setBookingCompleteLocal(true);
      setBookingComplete(data.booking.booking_number); // Update store
      setLoading(false);
      
      // Invalidate dashboard cache for authenticated users
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });
      }
    },
    onError: (error: AxiosError | Error) => {
      setLoading(false);
      console.error('Booking creation failed:', error);
      
      // Check if it's an AxiosError before accessing response
      if ('response' in error && error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  });

  const handleSubmitBooking = () => {
    if (!termsAccepted) {
      alert('Please accept the Terms of Service to continue.');
      return;
    }
    
    setLoading(true);
    createBookingMutation.mutate();
  };

  const handleStartOver = () => {
    console.log('🔄 Starting over - resetting wizard and navigating to fresh booking page');
    resetWizard();
    setBookingCompleteLocal(false);
    setBookingNumber('');
    
    // Force navigation to fresh booking page with reset flag
    router.push('/book?reset=true');
  };

  const handleGoToDashboard = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
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
                Your luxury move is confirmed. 
                {isAuthenticated ? (
                  ' Check your dashboard for booking details.'
                ) : (
                  <>
                    We'll send a confirmation email to{' '}
                    <strong>{bookingData.customer_info?.email}</strong> with all the details.
                  </>
                )}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <span className="font-medium text-navy-900">Pickup:</span>
                  <p className="text-navy-700">
                    {new Date(bookingData.pickup_date!).toLocaleDateString()} at{' '}
                    {getTimeDisplay(bookingData.pickup_time, bookingData.specific_pickup_hour)}
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

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleStartOver}
            className="w-full sm:w-auto"
          >
            Book Another Move
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGoToDashboard}
            className="w-full sm:w-auto"
          >
            {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
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

            {/* Date & Time - FIXED */}
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
                {getTimeDisplay(bookingData.pickup_time, bookingData.specific_pickup_hour)}
              </p>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Pickup Address</h4>
                <div className="text-navy-700 text-sm">
                  <div>{bookingData.pickup_address?.address_line_1}</div>
                  {bookingData.pickup_address?.address_line_2 && (
                    <div>{bookingData.pickup_address.address_line_2}</div>
                  )}
                  <div>
                    {bookingData.pickup_address?.city}, {bookingData.pickup_address?.state} {bookingData.pickup_address?.zip_code}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Delivery Address</h4>
                <div className="text-navy-700 text-sm">
                  <div>{bookingData.delivery_address?.address_line_1}</div>
                  {bookingData.delivery_address?.address_line_2 && (
                    <div>{bookingData.delivery_address.address_line_2}</div>
                  )}
                  <div>
                    {bookingData.delivery_address?.city}, {bookingData.delivery_address?.state} {bookingData.delivery_address?.zip_code}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info - only show for guest bookings */}
            {!isAuthenticated && (
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Contact Information</h4>
                <div className="text-navy-700">
                  <div>
                    {bookingData.customer_info?.first_name} {bookingData.customer_info?.last_name}
                  </div>
                  <div>{bookingData.customer_info?.email}</div>
                  <div>{bookingData.customer_info?.phone}</div>
                </div>
              </div>
            )}

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

      {/* Terms of Service Agreement */}
      <Card variant="default" className="border-navy-200">
        <CardHeader>
          <h3 className="text-lg font-medium text-navy-900">Terms of Service Agreement</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 rounded text-xs text-navy-700 border">
              <p className="font-medium mb-2">PLEASE READ THESE TERMS AND CONDITIONS CAREFULLY</p>
              <p className="mb-2">
                By using Tote Taxi and/or the Tote Taxi Website, you are agreeing to be bound by these terms and conditions. 
                If you do not agree to the terms and conditions, do not use Tote Taxi's services or the Tote Taxi Website.
              </p>
              <p className="mb-2">
                Tote Taxi LLC ("Tote Taxi") may revise and update these Terms and Conditions at any time without notice. 
                Your continued usage of the Tote Taxi Website after any such change or update will mean you accept those changes or updates.
              </p>
              <p className="mb-2">
                Tote Taxi will not accept for transport luggage or packages in excess of $150.00 in value. 
                Tote Taxi's inadvertent acceptance of any luggage or package in excess of $150.00 shall not negate 
                Tote Taxi's limitation of liability stated herein.
              </p>
              <p className="mb-2">
                By delivering luggage or package to, or causing luggage or package to be delivered to, Tote Taxi for transport, 
                you represent that the luggage or package does not contain any illegal substances, any liquids, or any hazardous materials, 
                and does not exceed $150.00 in value.
              </p>
              <p className="text-xs text-navy-500 mt-4">
                [Complete terms available at totetaxi.com/terms]
              </p>
            </div>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-navy-600 rounded border-gray-300 focus:ring-navy-500"
              />
              <div className="text-sm">
                <span className="text-navy-900 font-medium">
                  I acknowledge that I have read, understood, and agree to be bound by the Terms of Service.
                </span>
                <p className="text-navy-600 mt-1">
                  By checking this box, you confirm your acceptance of all terms and conditions, 
                  including the $150 liability limit and item restrictions.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

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
          disabled={isLoading || createBookingMutation.isPending || !termsAccepted}
          className="w-full sm:w-auto"
        >
          {isLoading || createBookingMutation.isPending ? 'Creating Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}