// frontend/src/app/staff/bookings/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BookingDetailPage() {
  const { isAuthenticated, isLoading } = useStaffAuthStore();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['staff', 'booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/staff/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: !!bookingId && isAuthenticated
  });

  if (isLoading || !isAuthenticated || bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold text-navy-900">
            Booking Details
          </h1>
          <Button variant="outline" onClick={() => router.back()}>
            ← Back to Bookings
          </Button>
        </div>

        {booking && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Booking Information</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><strong>Booking #:</strong> {booking.booking?.booking_number}</div>
                <div><strong>Service:</strong> {booking.booking?.service_type}</div>
                <div><strong>Status:</strong> {booking.booking?.status}</div>
                <div><strong>Pickup Date:</strong> {booking.booking?.pickup_date}</div>
                <div><strong>Total:</strong> ${booking.booking?.total_price_dollars}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Customer Information</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.customer && (
                  <>
                    <div><strong>Name:</strong> {booking.customer.name}</div>
                    <div><strong>Email:</strong> {booking.customer.email}</div>
                    <div><strong>Phone:</strong> {booking.customer.phone}</div>
                  </>
                )}
                {booking.guest_checkout && (
                  <>
                    <div><strong>Name:</strong> {booking.guest_checkout.first_name} {booking.guest_checkout.last_name}</div>
                    <div><strong>Email:</strong> {booking.guest_checkout.email}</div>
                    <div><strong>Phone:</strong> {booking.guest_checkout.phone}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}