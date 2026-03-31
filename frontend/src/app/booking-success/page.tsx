'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';

/**
 * Handles Stripe 3D Secure redirects.
 *
 * When a card requires redirect-based authentication, Stripe navigates the
 * browser to the bank's auth page and then back to this URL with query params:
 *   ?payment_intent=pi_xxx&redirect_status=succeeded
 *
 * The booking data is still in localStorage (Zustand store), so we can
 * create the booking from here.
 */
function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bookingData, setBookingComplete, clearPendingPaymentIntentId, isGuestMode, resetWizard } = useBookingWizard();
  const { isAuthenticated, user } = useAuthStore();

  const [bookingNumber, setBookingNumber] = useState('');
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);

  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const createBookingMutation = useMutation({
    retry: (failureCount, error) => {
      if ('response' in error && (error as AxiosError).response) return false;
      return failureCount < 2;
    },
    retryDelay: 3000,
    mutationFn: async (piId: string) => {
      const endpoint = isAuthenticated
        ? '/api/customer/bookings/create/'
        : '/api/public/guest-booking/';

      const bookingRequest: any = {
        payment_intent_id: piId,
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

      if (bookingData.discount_code && bookingData.discount_validated) {
        bookingRequest.discount_code = bookingData.discount_code;
      }

      const response = await apiClient.post(endpoint, bookingRequest);
      return response.data;
    },
    onSuccess: (data) => {
      clearPendingPaymentIntentId();
      setBookingNumber(data.booking.booking_number);
      setBookingComplete(data.booking.booking_number);
    },
    onError: (error: AxiosError | Error) => {
      console.error('Booking creation failed after 3D Secure redirect:', error);
      if ('response' in error && error.response) {
        const data = error.response.data as any;
        // If already used, the booking was likely created by the recovery mechanism
        if (data?.error === 'This payment has already been used for a booking') {
          setError('Your booking has already been created. Please check your email for confirmation.');
          return;
        }
      }
      setError(
        'Your payment was processed but we encountered an error creating your booking. ' +
        'Please call (631) 595-5100 for assistance.'
      );
    },
  });

  useEffect(() => {
    if (attempted) return;
    setAttempted(true);

    if (!paymentIntentId || redirectStatus !== 'succeeded') {
      setError('Invalid payment redirect. If you were charged, please call (631) 595-5100.');
      return;
    }

    if (!bookingData.service_type) {
      setError(
        'Your payment was processed but booking details were lost. ' +
        'Please call (631) 595-5100 to complete your booking.'
      );
      return;
    }

    createBookingMutation.mutate(paymentIntentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Success state
  if (bookingNumber) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center p-4">
          <Card variant="luxury" className="max-w-md w-full">
            <CardContent className="text-center space-y-4 p-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-serif font-bold text-navy-900">
                Payment Successful!
              </h2>
              <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                <span className="text-sm text-gold-700">Your Booking Number</span>
                <div className="text-2xl font-bold text-navy-900">{bookingNumber}</div>
              </div>
              <p className="text-navy-700">
                We&apos;ll send a confirmation email with all the details.
              </p>
              <Button
                onClick={() => {
                  resetWizard();
                  router.push(isAuthenticated ? '/dashboard' : '/');
                }}
                className="w-full"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Back to Home'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center p-4">
          <Card variant="luxury" className="max-w-md w-full">
            <CardContent className="text-center space-y-4 p-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-serif font-bold text-navy-900">
                Booking Issue
              </h2>
              <p className="text-navy-700">{error}</p>
              <a
                href="tel:+16315955100"
                className="inline-block bg-navy-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-navy-800 transition-colors"
              >
                Call (631) 595-5100
              </a>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center p-4">
        <Card variant="luxury" className="max-w-md w-full">
          <CardContent className="text-center space-y-4 p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900 mx-auto" />
            <h2 className="text-xl font-serif font-bold text-navy-900">
              Completing Your Booking...
            </h2>
            <p className="text-navy-600">
              Your payment was successful. We&apos;re finalizing your booking now.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900" />
        </div>
      </MainLayout>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
