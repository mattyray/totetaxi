// frontend/src/components/booking/review-payment-step.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api-client';
import { getStripe } from '@/lib/stripe';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';
import type { ServiceCatalog } from '@/types';
import { useDiscountCode } from '@/hooks/use-discount-code';

interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_dollars: number;
}

interface BookingResponse {
  message: string;
  booking: {
    id: string;
    booking_number: string;
    total_price_dollars: number;
    status: string;
  };
}

function CheckoutForm({ 
  clientSecret, 
  paymentIntentId,
  totalAmount, 
  onSuccess 
}: { 
  clientSecret: string;
  paymentIntentId: string;
  totalAmount: number;
  onSuccess: (paymentIntentId: string) => void;
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
      console.log('✅ Payment succeeded:', paymentIntent.id);
      onSuccess(paymentIntentId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-navy-50 border border-navy-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
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

// Hook to recalculate pricing when Review & Pay loads.
// Uses a ref to avoid stale closure over bookingData (L8 fix).
const useRecalculatePricing = () => {
  const { bookingData, updateBookingData } = useBookingWizard();
  const { user } = useAuthStore();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const bookingDataRef = useRef(bookingData);
  bookingDataRef.current = bookingData;

  useEffect(() => {
    const recalculatePricing = async () => {
      if (isRecalculating) return;

      setIsRecalculating(true);
      const data = bookingDataRef.current;

      try {
        let pricingRequest: any = {
          service_type: data.service_type,
          pickup_date: data.service_type === 'blade_transfer'
            ? data.blade_flight_date
            : data.pickup_date,
          coi_required: data.coi_required || false,
          pickup_zip_code: data.pickup_address?.zip_code,
          delivery_zip_code: data.delivery_address?.zip_code,
          is_outside_core_area: data.is_outside_core_area || false,
        };

        if (data.service_type === 'mini_move') {
          pricingRequest.mini_move_package_id = data.mini_move_package_id;
          pricingRequest.include_packing = data.include_packing;
          pricingRequest.include_unpacking = data.include_unpacking;
          pricingRequest.pickup_time = data.pickup_time;
          pricingRequest.specific_pickup_hour = data.specific_pickup_hour;
        } else if (data.service_type === 'standard_delivery') {
          pricingRequest.standard_delivery_item_count = data.standard_delivery_item_count;
          pricingRequest.item_description = data.item_description;
          pricingRequest.is_same_day_delivery = data.is_same_day_delivery;
          pricingRequest.specialty_items = data.specialty_items;
        } else if (data.service_type === 'specialty_item') {
          pricingRequest.specialty_items = data.specialty_items;
          pricingRequest.is_same_day_delivery = data.is_same_day_delivery;
        } else if (data.service_type === 'blade_transfer') {
          pricingRequest.blade_airport = data.blade_airport;
          pricingRequest.blade_flight_date = data.blade_flight_date;
          pricingRequest.blade_flight_time = data.blade_flight_time;
          pricingRequest.blade_bag_count = data.blade_bag_count;
          pricingRequest.transfer_direction = data.transfer_direction || 'to_airport';
          if (data.blade_terminal) pricingRequest.blade_terminal = data.blade_terminal;
        }

        // Include discount code if validated
        if (data.discount_code && data.discount_validated) {
          pricingRequest.discount_code = data.discount_code;
          pricingRequest.discount_email = user?.email || data.customer_info?.email || '';
        }

        const response = await apiClient.post('/api/public/pricing-preview/', pricingRequest);

        updateBookingData({
          pricing_data: response.data.pricing,
          blade_ready_time: response.data.details?.ready_time
        });
      } catch (error) {
        console.error('Failed to recalculate pricing:', error);
      } finally {
        setIsRecalculating(false);
      }
    };

    recalculatePricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData.discount_code, bookingData.discount_validated]);

  return isRecalculating;
};

// ✅ Component to display specialty items with quantities
function SpecialtyItemsList({ bookingData }: { bookingData: any }) {
  const { data: services } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async (): Promise<ServiceCatalog> => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  if (!bookingData.specialty_items || bookingData.specialty_items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {bookingData.specialty_items.map((item: { item_id: string; quantity: number }) => {
        const specialtyItem = services?.specialty_items.find(s => s.id === item.item_id);
        if (!specialtyItem) return null;
        
        return (
          <div key={item.item_id} className="text-sm text-navy-600">
            • {item.quantity}x {specialtyItem.name} (${(specialtyItem.price_dollars * item.quantity).toFixed(2)})
          </div>
        );
      })}
    </div>
  );
}

function DiscountCodeInput() {
  const [inputCode, setInputCode] = useState('');
  const { validateCode, removeCode, isValidating, error, success, appliedCode } = useDiscountCode();

  const handleApply = () => {
    validateCode(inputCode);
  };

  const handleRemove = () => {
    setInputCode('');
    removeCode();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
        <div>
          <span className="text-green-800 font-medium">
            Code &quot;{appliedCode.code}&quot; applied
          </span>
          <span className="text-green-700 text-sm ml-2">
            ({appliedCode.discount_description} off)
          </span>
        </div>
        <button
          onClick={handleRemove}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Enter discount code"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-navy-900 placeholder:text-navy-400 focus:ring-navy-500 focus:border-navy-500"
          maxLength={50}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!inputCode.trim() || isValidating}
        >
          {isValidating ? 'Checking...' : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}

export function ReviewPaymentStep() {
  const { bookingData, resetWizard, setLoading, isLoading, setBookingComplete, previousStep, isGuestMode } = useBookingWizard();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const isPricingRecalculating = useRecalculatePricing();
  
  const [bookingComplete, setBookingCompleteLocal] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const stripePromise = getStripe();

  // STEP 1: Create payment intent
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (): Promise<PaymentIntentResponse> => {
      const endpoint = isAuthenticated 
        ? '/api/customer/bookings/create-payment-intent/'
        : '/api/public/create-payment-intent/';

      let paymentRequest: any = {
        service_type: bookingData.service_type,
        pickup_date: bookingData.service_type === 'blade_transfer'
          ? bookingData.blade_flight_date
          : bookingData.pickup_date,
        coi_required: bookingData.coi_required || false,
        // Send ZIP codes for accurate geographic surcharge calculation ($175 per out-of-zone address)
        pickup_zip_code: bookingData.pickup_address?.zip_code,
        delivery_zip_code: bookingData.delivery_address?.zip_code,
        // Keep is_outside_core_area as fallback for backwards compatibility
        is_outside_core_area: bookingData.is_outside_core_area || false,
      };

      if (bookingData.service_type === 'mini_move') {
        paymentRequest.mini_move_package_id = bookingData.mini_move_package_id;
        paymentRequest.include_packing = bookingData.include_packing;
        paymentRequest.include_unpacking = bookingData.include_unpacking;
        paymentRequest.pickup_time = bookingData.pickup_time;
        paymentRequest.specific_pickup_hour = bookingData.specific_pickup_hour;
      } else if (bookingData.service_type === 'standard_delivery') {
        paymentRequest.standard_delivery_item_count = bookingData.standard_delivery_item_count;
        paymentRequest.item_description = bookingData.item_description;
        paymentRequest.is_same_day_delivery = bookingData.is_same_day_delivery;
        paymentRequest.specialty_items = bookingData.specialty_items;
      } else if (bookingData.service_type === 'specialty_item') {
        paymentRequest.specialty_items = bookingData.specialty_items;
        paymentRequest.is_same_day_delivery = bookingData.is_same_day_delivery;
      } else if (bookingData.service_type === 'blade_transfer') {
        paymentRequest.blade_airport = bookingData.blade_airport;
        paymentRequest.blade_flight_date = bookingData.blade_flight_date;
        paymentRequest.blade_flight_time = bookingData.blade_flight_time;
        paymentRequest.blade_bag_count = bookingData.blade_bag_count;
        paymentRequest.transfer_direction = bookingData.transfer_direction || 'to_airport';
        if (bookingData.blade_terminal) paymentRequest.blade_terminal = bookingData.blade_terminal;
      }

      if (!isAuthenticated && bookingData.customer_info?.email) {
        paymentRequest.email = bookingData.customer_info.email;
        paymentRequest.first_name = bookingData.customer_info.first_name;
        paymentRequest.last_name = bookingData.customer_info.last_name;
        paymentRequest.phone = bookingData.customer_info.phone;
      } else if (isAuthenticated && user?.email) {
        paymentRequest.customer_email = user.email;
      }

      // Include discount code if validated
      if (bookingData.discount_code && bookingData.discount_validated) {
        paymentRequest.discount_code = bookingData.discount_code;
      }

      console.log('💳 Creating payment intent:', paymentRequest);
      const response = await apiClient.post(endpoint, paymentRequest);
      console.log('✅ Payment intent created:', response.data);
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('💳 Payment intent successful:', data);

      // Free order — skip Stripe payment, go directly to booking
      if (data.payment_intent_id.startsWith('free_order_')) {
        console.log('🎉 Free order — skipping payment');
        createBookingMutation.mutate(data.payment_intent_id);
        return;
      }

      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id);
      setShowPayment(true);
      setLoading(false);
    },
    onError: (error: AxiosError | Error) => {
      console.error('❌ Payment intent failed:', error);
      setLoading(false);
      if ('response' in error && error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  });

  // STEP 2: Create booking AFTER payment succeeds
  const createBookingMutation = useMutation({
    mutationFn: async (paymentIntentId: string): Promise<BookingResponse> => {
      const endpoint = isAuthenticated 
        ? '/api/customer/bookings/create/'
        : '/api/public/guest-booking/';

      let bookingRequest: any = {
        payment_intent_id: paymentIntentId,
        service_type: bookingData.service_type,
        pickup_date: bookingData.service_type === 'blade_transfer' 
          ? bookingData.blade_flight_date 
          : bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        specific_pickup_hour: bookingData.specific_pickup_hour,
        special_instructions: bookingData.special_instructions,
        coi_required: bookingData.coi_required,
      };

      if (bookingData.service_type === 'mini_move') {
        bookingRequest.mini_move_package_id = bookingData.mini_move_package_id;
        bookingRequest.include_packing = bookingData.include_packing;
        bookingRequest.include_unpacking = bookingData.include_unpacking;
      } else if (bookingData.service_type === 'standard_delivery') {
        bookingRequest.standard_delivery_item_count = bookingData.standard_delivery_item_count;
        bookingRequest.item_description = bookingData.item_description;
        bookingRequest.is_same_day_delivery = bookingData.is_same_day_delivery;
        bookingRequest.specialty_items = bookingData.specialty_items;
      } else if (bookingData.service_type === 'specialty_item') {
        bookingRequest.specialty_items = bookingData.specialty_items;
        bookingRequest.is_same_day_delivery = bookingData.is_same_day_delivery;
      } else if (bookingData.service_type === 'blade_transfer') {
        bookingRequest.blade_airport = bookingData.blade_airport;
        bookingRequest.blade_flight_date = bookingData.blade_flight_date;
        bookingRequest.blade_flight_time = bookingData.blade_flight_time;
        bookingRequest.blade_bag_count = bookingData.blade_bag_count;
        bookingRequest.transfer_direction = bookingData.transfer_direction || 'to_airport';
        if (bookingData.blade_terminal) bookingRequest.blade_terminal = bookingData.blade_terminal;
      }

      if (isAuthenticated) {
        const timestamp = new Date().toISOString().slice(11, 16);
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        bookingRequest.new_pickup_address = bookingData.pickup_address;
        bookingRequest.new_delivery_address = bookingData.delivery_address;
        bookingRequest.save_pickup_address = true;
        bookingRequest.save_delivery_address = true;
        bookingRequest.pickup_address_nickname = `Pickup ${dateStr} ${timestamp}`;
        bookingRequest.delivery_address_nickname = `Delivery ${dateStr} ${timestamp}`;
      } else {
        bookingRequest.first_name = bookingData.customer_info?.first_name;
        bookingRequest.last_name = bookingData.customer_info?.last_name;
        bookingRequest.email = bookingData.customer_info?.email;
        bookingRequest.phone = bookingData.customer_info?.phone;
        bookingRequest.pickup_address = bookingData.pickup_address;
        bookingRequest.delivery_address = bookingData.delivery_address;
      }

      // Include discount code if validated
      if (bookingData.discount_code && bookingData.discount_validated) {
        bookingRequest.discount_code = bookingData.discount_code;
      }

      console.log('📦 Creating booking with payment:', bookingRequest);
      const response = await apiClient.post(endpoint, bookingRequest);
      console.log('✅ Booking created:', response.data);

      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Booking creation successful:', data);
      setBookingNumber(data.booking.booking_number);
      setBookingCompleteLocal(true);
      setBookingComplete(data.booking.booking_number);
      setLoading(false);
      
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });
      }
    },
    onError: (error: AxiosError | Error) => {
      console.error('❌ Booking creation failed:', error);
      setLoading(false);
      if ('response' in error && error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  });

  const handleInitiatePayment = () => {
    if (!termsAccepted) {
      alert('Please accept the Terms of Service to continue.');
      return;
    }
    
    console.log('=== INITIATING PAYMENT FLOW ===');
    setLoading(true);
    createPaymentIntentMutation.mutate();
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('💳 Payment successful, creating booking with payment ID:', paymentIntentId);
    setLoading(true);
    createBookingMutation.mutate(paymentIntentId);
  };

  const handleStartOver = () => {
    console.log('Starting over - resetting wizard');
    setBookingCompleteLocal(false);
    setBookingNumber('');
    setClientSecret('');
    setPaymentIntentId('');
    setShowPayment(false);
    resetWizard();
    router.push('/book');
  };

  const handlePreviousStep = () => {
    if (showPayment) {
      setShowPayment(false);
      setClientSecret('');
      setPaymentIntentId('');
    } else {
      previousStep();
    }
  };

  if (isPricingRecalculating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900 mx-auto mb-4"></div>
          <p className="text-navy-700">Calculating final pricing...</p>
        </div>
      </div>
    );
  }

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
                  ? 'Your airport transfer is confirmed and paid.'
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
                paymentIntentId={paymentIntentId}
                totalAmount={bookingData.pricing_data?.total_price_dollars || 0}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePreviousStep}>
            ← Back to Review
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
                {bookingData.service_type === 'blade_transfer' && 'Airport Transfer'}
              </p>
              
              {/* ✅ Display specialty items with quantities */}
              <SpecialtyItemsList bookingData={bookingData} />
              
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
                    <strong>Direction:</strong> {bookingData.transfer_direction === 'from_airport' ? 'Airport to NYC (Arrival Pickup)' : 'NYC to Airport (Departure Drop-off)'}
                  </p>
                  <p className="text-navy-700">
                    <strong>Airport:</strong> {bookingData.blade_airport === 'JFK' ? 'JFK International' : 'Newark Liberty (EWR)'}
                    {bookingData.blade_terminal && ` — Terminal ${bookingData.blade_terminal}`}
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
                    <strong>{bookingData.transfer_direction === 'from_airport' ? 'Flight Arrival Time' : 'Flight Departure Time'}:</strong> {bookingData.blade_flight_time && new Date(`2000-01-01T${bookingData.blade_flight_time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                  <p className="text-navy-700">
                    <strong>Bags:</strong> {bookingData.blade_bag_count}
                  </p>
                  {bookingData.transfer_direction !== 'from_airport' && bookingData.blade_ready_time && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-sm text-blue-800">
                        <strong>Pickup Ready Time:</strong> {new Date(`2000-01-01T${bookingData.blade_ready_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  )}
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
                  {bookingData.service_type === 'blade_transfer'
                    ? bookingData.transfer_direction === 'from_airport' ? 'Pickup (Airport)' : 'Pickup Address (Your Location)'
                    : 'Pickup Address'}
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
                  {bookingData.service_type === 'blade_transfer'
                    ? bookingData.transfer_direction === 'from_airport' ? 'Delivery Address (Your Location)' : 'Delivery (Airport)'
                    : 'Delivery Address'}
                </h4>
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

      <Card variant="default" className="border-navy-200">
        <CardHeader>
          <h3 className="text-lg font-medium text-navy-900">Discount Code</h3>
        </CardHeader>
        <CardContent>
          <DiscountCodeInput />
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
                <span className="text-navy-900 font-medium">
                  {bookingData.service_type === 'blade_transfer' && `${bookingData.blade_bag_count} bags × $75:`}
                  {bookingData.service_type === 'mini_move' && 'Mini Move Package:'}
                  {bookingData.service_type === 'standard_delivery' && 'Base Service:'}
                  {bookingData.service_type === 'specialty_item' && 'Specialty Items:'}
                </span>
                <span className="text-navy-900 font-semibold">${bookingData.pricing_data.base_price_dollars}</span>
              </div>
              
              {bookingData.pricing_data.same_day_delivery_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">Same-Day Delivery:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.same_day_delivery_dollars}</span>
                </div>
              )}
              
              {bookingData.pricing_data.surcharge_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">Peak Date Surcharge:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.surcharge_dollars}</span>
                </div>
              )}
              
              {bookingData.pricing_data.coi_fee_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">COI Fee:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.coi_fee_dollars}</span>
                </div>
              )}
              
              {bookingData.pricing_data.organizing_total_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">Organizing Services:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.organizing_total_dollars}</span>
                </div>
              )}

              {bookingData.pricing_data.organizing_tax_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">Tax (8.25%):</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.organizing_tax_dollars}</span>
                </div>
              )}

              {bookingData.pricing_data.time_window_surcharge_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">1-Hour Window:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.time_window_surcharge_dollars}</span>
                </div>
              )}
              
              {bookingData.pricing_data.geographic_surcharge_dollars > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-900 font-medium">Distance Surcharge:</span>
                  <span className="text-navy-900 font-semibold">+${bookingData.pricing_data.geographic_surcharge_dollars}</span>
                </div>
              )}
              
              {(bookingData.pricing_data.discount_amount_dollars ?? 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span className="font-medium">
                    Discount ({bookingData.discount_info?.discount_description}):
                  </span>
                  <span className="font-semibold">-${bookingData.pricing_data.discount_amount_dollars?.toFixed(2)}</span>
                </div>
              )}

              <hr className="border-gray-200" />

              <div className="flex justify-between text-xl font-bold">
                <span className="text-navy-900">Total:</span>
                <span className="text-navy-900">${bookingData.pricing_data.total_price_dollars.toFixed(2)}</span>
              </div>
              
              {bookingData.service_type === 'blade_transfer' && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>No surcharges!</strong> Airport transfer pricing is straightforward with no weekend, geographic, or time window fees.
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
          onClick={handleInitiatePayment}
          disabled={isLoading || createPaymentIntentMutation.isPending || !termsAccepted}
        >
          {isLoading || createPaymentIntentMutation.isPending ? 'Preparing Payment...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
}