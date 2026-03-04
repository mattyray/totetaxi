'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Suspense } from 'react';

interface BookingStatus {
  booking_number: string;
  service_type: string;
  status: string;
  pickup_date: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  const { data, isLoading, error } = useQuery<BookingStatus>({
    queryKey: ['booking-status', bookingId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/public/booking-status/${bookingId}/`);
      return res.data;
    },
    enabled: !!bookingId,
  });

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
        {isLoading ? (
          <div className="py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900 mx-auto" />
          </div>
        ) : error || !data ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">Payment Received</h1>
            <p className="text-navy-600 mb-6">
              Thank you! Your payment has been received. You will receive a confirmation email shortly.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">Payment Received</h1>
            <p className="text-navy-600 mb-6">
              Thank you! Your booking has been confirmed.
            </p>
            <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-navy-500">Booking:</div>
                <div className="font-medium text-navy-900">{data.booking_number}</div>
                <div className="text-navy-500">Status:</div>
                <div className="font-medium text-navy-900 capitalize">{data.status}</div>
                <div className="text-navy-500">Pickup Date:</div>
                <div className="font-medium text-navy-900">
                  {new Date(data.pickup_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
            <p className="text-sm text-navy-500">
              A confirmation email has been sent. If you have any questions, contact us at{' '}
              <a href="mailto:info@totetaxi.com" className="text-navy-700 underline">info@totetaxi.com</a>
              {' '}or call <a href="tel:6315955100" className="text-navy-700 underline">(631) 595-5100</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
