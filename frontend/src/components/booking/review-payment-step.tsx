'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api-client';
import { getStripe } from '@/lib/stripe';
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
  payment?: {
    client_secret: string;
    payment_intent_id: string;
  };
}

function CheckoutForm({ clientSecret, bookingNumber, totalAmount, onSuccess }: { 
  clientSecret: string; 
  bookingNumber: string;
  totalAmount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(undefined);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await apiClient.post('/api/payments/confirm/', {
          payment_intent_id: paymentIntent.id
        });
      } catch (err) {
        console.error('Failed to confirm payment with backend:', err);
      }
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-navy-50 border border-navy-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-navy-700">Booking Number:</span>
          <span className="font-bold text-navy-900">{bookingNumber}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-navy-700">Total Amount:</span>
          <span className="text-2xl font-bold text-navy-900">${totalAmount}</span>
        </div>
      </div>

      <PaymentElement />
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
        variant="primary"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${totalAmount}`}
      </Button>

      <p className="text-xs text-center text-navy-600">
        Payments are processed securely through Stripe. Your card information is never stored on our servers.
      </p>
    </form>
  );
}

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
  const { bookingData, resetWizard, setLoading, isLoading, setBookingComplete, previousStep, isGuestMode } = useBookingWizard();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [bookingComplete, setBookingCompleteLocal] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const stripePromise = getStripe();

  useEffect(() => {
    console.log('=== REVIEW PAYMENT STEP DEBUG ===');
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Is Guest Mode:', isGuestMode);
    console.log('User:', user);
    console.log('Customer Info:', bookingData.customer_info);
    console.log('Service Type:', bookingData.service_type);
    console.log('==================================');
  }, [isAuthenticated, isGuestMode, user, bookingData.customer_info, bookingData.service_type]);

  const createBookingMutation = useMutation({
    mutationFn: async (): Promise<BookingResponse> => {
      const endpoint = isAuthenticated 
        ? '/api/customer/bookings/create/'
        : '/api/public/guest-booking/';

      let bookingRequest;

      if (isAuthenticated) {
        console.log('=== AUTHENTICATED BOOKING REQUEST ===');
        const timestamp = new Date().toISOString().slice(11, 16);
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        bookingRequest = {
          service_type: bookingData.service_type,
          mini_move_package_id: bookingData.mini_move_package_id,
          include_packing: bookingData.include_packing,
          include_unpacking: bookingData.include_unpacking,
          standard_delivery_item_count: bookingData.standard_delivery_item_count,
          is_same_day_delivery: bookingData.is_same_day_delivery,
          specialty_item_ids: bookingData.specialty_item_ids,
          
          blade_airport: bookingData.blade_airport,
          blade_flight_date: bookingData.blade_flight_date,
          blade_flight_time: bookingData.blade_flight_time,
          blade_bag_count: bookingData.blade_bag_count,
          
          pickup_date: bookingData.service_type === 'blade_transfer' 
            ? bookingData.blade_flight_date 
            : bookingData.pickup_date,
          pickup_time: bookingData.pickup_time,
          specific_pickup_hour: bookingData.specific_pickup_hour,
          
          new_pickup_address: bookingData.pickup_address,
          new_delivery_address: bookingData.delivery_address,
          save_pickup_address: true,
          save_delivery_address: true,
          pickup_address_nickname: `Pickup ${dateStr} ${timestamp}`,
          delivery_address_nickname: `Delivery ${dateStr} ${timestamp}`,
          
          special_instructions: bookingData.special_instructions,
          coi_required: bookingData.coi_required,
          create_payment_intent: true,
        };
      } else {
        console.log('=== GUEST BOOKING REQUEST ===');
        
        if (!bookingData.customer_info || !bookingData.customer_info.email) {
          console.error('CRITICAL: Guest booking missing customer info');
          
          if (user && !bookingData.customer_info) {
            console.log('Falling back to authenticated user data');
            bookingRequest = {
              first_name: user.first_name || 'Guest',
              last_name: user.last_name || 'User',
              email: user.email,
              phone: '555-0000',
              
              service_type: bookingData.service_type,
              mini_move_package_id: bookingData.mini_move_package_id,
              include_packing: bookingData.include_packing,
              include_unpacking: bookingData.include_unpacking,
              standard_delivery_item_count: bookingData.standard_delivery_item_count,
              is_same_day_delivery: bookingData.is_same_day_delivery,
              specialty_item_ids: bookingData.specialty_item_ids,
              
              blade_airport: bookingData.blade_airport,
              blade_flight_date: bookingData.blade_flight_date,
              blade_flight_time: bookingData.blade_flight_time,
              blade_bag_count: bookingData.blade_bag_count,
              
              pickup_date: bookingData.service_type === 'blade_transfer' 
                ? bookingData.blade_flight_date 
                : bookingData.pickup_date,
              pickup_time: bookingData.pickup_time,
              specific_pickup_hour: bookingData.specific_pickup_hour,
              
              pickup_address: bookingData.pickup_address,
              delivery_address: bookingData.delivery_address,
              
              special_instructions: bookingData.special_instructions,
              coi_required: bookingData.coi_required,
              create_payment_intent: true,
            };
          } else {
            throw new Error('Customer information is required for guest bookings. Please go back and fill out your contact information.');
          }
        } else {
          bookingRequest = {
            first_name: bookingData.customer_info.first_name,
            last_name: bookingData.customer_info.last_name,
            email: bookingData.customer_info.email,
            phone: bookingData.customer_info.phone,
            
            service_type: bookingData.service_type,
            mini_move_package_id: bookingData.mini_move_package_id,
            include_packing: bookingData.include_packing,
            include_unpacking: bookingData.include_unpacking,
            standard_delivery_item_count: bookingData.standard_delivery_item_count,
            is_same_day_delivery: bookingData.is_same_day_delivery,
            specialty_item_ids: bookingData.specialty_item_ids,
            
            blade_airport: bookingData.blade_airport,
            blade_flight_date: bookingData.blade_flight_date,
            blade_flight_time: bookingData.blade_flight_time,
            blade_bag_count: bookingData.blade_bag_count,
            
            pickup_date: bookingData.service_type === 'blade_transfer' 
              ? bookingData.blade_flight_date 
              : bookingData.pickup_date,
            pickup_time: bookingData.pickup_time,
            specific_pickup_hour: bookingData.specific_pickup_hour,
            
            pickup_address: bookingData.pickup_address,
            delivery_address: bookingData.delivery_address,
            
            special_instructions: bookingData.special_instructions,
            coi_required: bookingData.coi_required,
            create_payment_intent: true,
          };
        }
      }

      console.log('ENDPOINT:', endpoint);
      console.log('FULL BOOKING REQUEST:', JSON.stringify(bookingRequest, null, 2));

      const response = await apiClient.post(endpoint, bookingRequest);
      
      console.log('BOOKING API RESPONSE:', response.data);
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('=== BOOKING SUCCESS HANDLER ===');
      console.log('Response data:', data);
      
      setBookingNumber(data.booking.booking_number);
      
      if (data.payment?.client_secret && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        console.log('PAYMENT INTENT FOUND - SHOWING PAYMENT FORM');
        setClientSecret(data.payment.client_secret);
        setShowPayment(true);
      } else {
        console.log('NO PAYMENT INTENT - MARKING COMPLETE');
        setBookingCompleteLocal(true);
        setBookingComplete(data.booking.booking_number);
      }
      
      setLoading(false);
      
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });
        
        // ADD THIS - Refresh CSRF token after booking
        apiClient.get('/api/customer/csrf-token/').catch(err => {
          console.warn('Failed to refresh CSRF token:', err);
        });
      }
    },
    onError: (error: AxiosError | Error) => {
      console.log('=== BOOKING ERROR HANDLER ===');
      setLoading(false);
      console.error('Booking creation failed:', error);
      
      if ('response' in error && error.response) {
        console.error('FULL ERROR RESPONSE:', error.response);
        console.error('Error Status:', error.response.status);
        console.error('Error Data:', error.response.data);
      }
    }
  });

  const handleSubmitBooking = () => {
    if (!termsAccepted) {
      alert('Please accept the Terms of Service to continue.');
      return;
    }
    
    console.log('=== SUBMITTING BOOKING ===');
    console.log('Service type:', bookingData.service_type);
    
    setLoading(true);
    createBookingMutation.mutate();
  };

  const handlePaymentSuccess = () => {
    console.log('PAYMENT SUCCESSFUL - SHOWING SUCCESS SCREEN');
    setBookingCompleteLocal(true);
    setBookingComplete(bookingNumber);
  };

  const handleStartOver = () => {
    console.log('STARTING OVER - RESETTING WIZARD');
    setBookingCompleteLocal(false);
    setBookingNumber('');
    setClientSecret('');
    setShowPayment(false);
    resetWizard();
    router.push('/book');
  };

  const handlePreviousStep = () => {
    if (showPayment) {
      setShowPayment(false);
      setClientSecret('');
    }
    
    previousStep();
  };

  if (bookingComplete) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">✅</div>
        
        <Card variant="luxury">
          <CardContent>
            <h3 className="text-2xl font-serif font-bold text-navy-900 mb-4">
              Payment Successful!
            </h3>
            
            <div className="space-y-3">
              <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                <span className="text-sm text-gold-700">Your Booking Number</span>
                <div className="text-2xl font-bold text-navy-900">{bookingNumber}</div>
              </div>
              
              <p className="text-navy-700">
                {bookingData.service_type === 'blade_transfer' 
                  ? 'Your BLADE airport transfer is confirmed and paid.' 
                  : 'Your luxury move is confirmed and paid.'}
                {isAuthenticated ? (
                  ' Check your dashboard for booking details.'
                ) : (
                  <>
                    {' '}We'll send a confirmation email to{' '}
                    <strong>{bookingData.customer_info?.email || user?.email}</strong> with all the details.
                  </>
                )}
              </p>
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
                  <p className="text-navy-600">
                    {bookingData.service_type === 'blade_transfer' 
                      ? 'We\'ll confirm your pickup details before your flight.' 
                      : 'We\'ll call 24 hours before pickup to confirm timing.'}
                  </p>
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
          <Button variant="outline" onClick={handleStartOver}>
            Book Another Move
          </Button>
          <Button variant="primary" onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}>
            {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  if (showPayment && clientSecret && stripePromise) {
    return (
      <div className="space-y-6">
        <Card variant="luxury">
          <CardHeader>
            <h3 className="text-xl font-serif font-bold text-navy-900">Complete Payment</h3>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>        
              <CheckoutForm 
                clientSecret={clientSecret} 
                bookingNumber={bookingNumber}
                totalAmount={bookingData.pricing_data?.total_price_dollars || 0}
                onSuccess={handlePaymentSuccess} 
              />
            </Elements>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePreviousStep}>
            ← Previous
          </Button>
          <Button variant="outline" onClick={handleStartOver}>
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && (!bookingData.customer_info || !bookingData.customer_info.email)) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent>
            <h3 className="text-lg font-medium text-red-800 mb-2">Missing Customer Information</h3>
            <p className="text-red-700 mb-4">
              We need your contact information to complete this booking. Please go back and fill out the customer information step.
            </p>
            <Button variant="outline" onClick={handlePreviousStep}>
              ← Go Back to Customer Info
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="luxury">
        <CardHeader>
          <h3 className="text-xl font-serif font-bold text-navy-900">Booking Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-navy-900 mb-2">Service</h4>
              <p className="text-navy-700">
                {bookingData.service_type === 'mini_move' && 'Mini Move'}
                {bookingData.service_type === 'standard_delivery' && 'Standard Delivery'}
                {bookingData.service_type === 'specialty_item' && 'Specialty Items'}
                {bookingData.service_type === 'blade_transfer' && 'BLADE Airport Transfer'}
              </p>
              
              {bookingData.include_packing && (
                <p className="text-sm text-navy-600">+ Professional Packing</p>
              )}
              {bookingData.include_unpacking && (
                <p className="text-sm text-navy-600">+ Professional Unpacking</p>
              )}
            </div>

            {bookingData.service_type === 'blade_transfer' ? (
              <>
                <div>
                  <h4 className="font-medium text-navy-900 mb-2">Flight Details</h4>
                  <p className="text-navy-700">
                    <strong>Airport:</strong> {bookingData.blade_airport === 'JFK' ? 'JFK International' : 'Newark Liberty (EWR)'}
                  </p>
                  <p className="text-navy-700">
                    <strong>Flight Date:</strong> {bookingData.blade_flight_date && new Date(bookingData.blade_flight_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-navy-700">
                    <strong>Flight Time:</strong> {bookingData.blade_flight_time && new Date(`2000-01-01T${bookingData.blade_flight_time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                  <p className="text-navy-700">
                    <strong>Bags:</strong> {bookingData.blade_bag_count}
                  </p>
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-sm text-blue-800">
                      <strong>Pickup Ready Time:</strong> {bookingData.blade_ready_time && new Date(`2000-01-01T${bookingData.blade_ready_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Pickup Schedule</h4>
                <p className="text-navy-700">
                  {bookingData.pickup_date && new Date(bookingData.pickup_date + 'T00:00:00').toLocaleDateString('en-US', {
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
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-navy-900 mb-2">
                  {bookingData.service_type === 'blade_transfer' ? 'Pickup Address (NYC)' : 'Pickup Address'}
                </h4>
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
                <h4 className="font-medium text-navy-900 mb-2">
                  {bookingData.service_type === 'blade_transfer' ? 'Delivery (Airport)' : 'Delivery Address'}
                </h4>
                <div className="text-navy-700 text-sm">
                  {bookingData.service_type === 'blade_transfer' ? (
                    <div className="font-medium">
                      {bookingData.blade_airport === 'JFK' ? 'JFK International Airport' : 'Newark Liberty International Airport (EWR)'}
                    </div>
                  ) : (
                    <>
                      <div>{bookingData.delivery_address?.address_line_1}</div>
                      {bookingData.delivery_address?.address_line_2 && (
                        <div>{bookingData.delivery_address.address_line_2}</div>
                      )}
                      <div>
                        {bookingData.delivery_address?.city}, {bookingData.delivery_address?.state} {bookingData.delivery_address?.zip_code}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isAuthenticated && bookingData.customer_info && (
              <div>
                <h4 className="font-medium text-navy-900 mb-2">Contact Information</h4>
                <div className="text-navy-700">
                  <div>
                    {bookingData.customer_info.first_name} {bookingData.customer_info.last_name}
                  </div>
                  <div>{bookingData.customer_info.email}</div>
                  <div>{bookingData.customer_info.phone}</div>
                </div>
              </div>
            )}

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
              
              {bookingData.service_type === 'blade_transfer' && (
                <div className="text-sm text-navy-600 italic">
                  {bookingData.blade_bag_count} bags × $75
                </div>
              )}
              
              {bookingData.pricing_data.same_day_delivery_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-700">Same-Day Delivery:</span>
                  <span className="font-medium">+${bookingData.pricing_data.same_day_delivery_dollars}</span>
                </div>
              )}
              
              {bookingData.pricing_data.surcharge_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-700">Weekend Surcharge:</span>
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

              {bookingData.pricing_data.organizing_tax_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-700">Tax (8.25%):</span>
                  <span className="font-medium">+${bookingData.pricing_data.organizing_tax_dollars}</span>
                </div>
              )}

              {bookingData.pricing_data.time_window_surcharge_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-700">1-Hour Window:</span>
                  <span className="font-medium">+${bookingData.pricing_data.time_window_surcharge_dollars}</span>
                </div>
              )}
              
              <hr className="border-gray-200" />
              
              <div className="flex justify-between text-xl font-bold">
                <span className="text-navy-900">Total:</span>
                <span className="text-navy-900">${bookingData.pricing_data.total_price_dollars}</span>
              </div>
              
              {bookingData.service_type === 'blade_transfer' && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>No surcharges!</strong> BLADE pricing is straightforward with no weekend, geographic, or time window fees.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="default" className="border-navy-200">
        <CardHeader>
          <h3 className="text-lg font-medium text-navy-900">Terms of Service Agreement</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto p-4 bg-gray-50 rounded text-xs text-navy-700 border leading-relaxed">
              <p className="font-bold mb-3 text-sm">PLEASE READ THESE TERMS AND CONDITIONS CAREFULLY</p>
              
              <p className="mb-3">
                BY USING Tote Taxi and/or the Tote Taxi Website, YOU ARE AGREEING TO BE BOUND BY THESE TERMS AND CONDITIONS. 
                IF YOU DO NOT AGREE TO THE TERMS AND CONDITIONS, DO NOT USE Tote Taxi'S SERVICES or the Tote Taxi Website.
              </p>

              <p className="font-semibold mb-2">General</p>
              <p className="mb-3">
                Tote Taxi LLC ("Tote Taxi") may revise and update these Terms and Conditions at any time without notice. 
                Your continued usage of the Tote Taxi Website after any such change or update will mean you accept those changes or updates.
              </p>

              <p className="mb-3">
                Any aspect of the Tote Taxi Website may be changed, supplemented, deleted or updated without notice at the sole discretion of Tote Taxi.
              </p>

              <p className="mb-3">
                Tote Taxi may establish or change its general practices and limits concerning Tote Taxi services in its sole discretion.
              </p>

              <p className="mb-3">
                Your violation of any of the Terms and Conditions may result in, among other things, the termination of your access to Tote Taxi's 
                services and/or the Tote Taxi Website.
              </p>

              <p className="font-semibold mb-2">Restrictions on Your Use of Tote Taxi</p>
              <p className="mb-3 font-medium text-orange-600">
                Tote Taxi will not accept for transport luggage or packages in excess of $150.00 in value. Tote Taxi's inadvertent acceptance 
                of any luggage or package in excess of $150.00 shall not negate Tote Taxi's limitation of liability stated herein.
              </p>

              <p className="mb-3">
                By delivering luggage or package to, or causing luggage or package to be delivered to, Tote Taxi for transport, you represent 
                that the luggage or package does not contain any illegal substances, any liquids, or any hazardous materials, and does not exceed $150.00 in value.
              </p>

              <p className="font-semibold mb-2">Limitation of Liability</p>
              <p className="mb-3">
                TO THE EXTENT NOT PROHIBITED BY APPLICABLE LAW, IN NO EVENT SHALL TOTE TAXI BE LIABLE FOR PERSONAL INJURY, OR ANY INCIDENTAL, 
                SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES WHATSOEVER, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT OR OTHERWISE) EVEN 
                IF Tote Taxi HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>

              <p className="mb-3">
                In no event shall Tote Taxi's total liability to you for all damages (other than as may be required by applicable law in cases 
                involving personal injury) exceed $150.00. The foregoing limitations will apply even if the above stated remedy fails of its essential purpose.
              </p>

              <p className="font-semibold mb-2">Controlling Law</p>
              <p className="mb-3">
                These Terms and Conditions are governed by and shall be construed in accordance with the internal substantive laws of the State of New York, 
                excluding any conflict-of-laws rule or principle that might refer the governance of the construction of the Terms and Conditions to the law 
                of another jurisdiction.
              </p>

              <p className="mb-3">
                Each party agrees to the exclusive jurisdiction of the state and federal courts in and for Suffolk County, New York for any litigation 
                or other dispute resolution relating in any way to these Terms and Conditions.
              </p>

              <p className="font-semibold mb-2 text-orange-600">Claims Deadline</p>
              <p className="mb-3 font-medium">
                YOU AGREE THAT ANY CLAIM OR CAUSE OF ACTION ARISING OUT OF OR RELATED TO YOUR USE OF THE TOTE TAXI WEBSITE OR SERVICES AND/OR 
                CONTENT MUST BE FILED WITHIN ONE (1) YEAR AFTER SUCH CLAIM OR CAUSE OF ACTION AROSE.
              </p>

              <p className="text-xs text-navy-500 mt-4 italic">
                Complete terms and conditions. Scroll to read all terms before accepting.
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
                  including the $150 liability limit, item restrictions, and one-year claims deadline.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="outline" 
          onClick={handlePreviousStep}
        >
          ← Previous
        </Button>
        
        <Button 
          variant="primary" 
          size="lg"
          onClick={handleSubmitBooking}
          disabled={isLoading || createBookingMutation.isPending || !termsAccepted}
        >
          {isLoading || createBookingMutation.isPending ? 'Creating Booking...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
}