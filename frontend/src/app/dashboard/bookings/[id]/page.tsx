// frontend/src/app/dashboard/bookings/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon, 
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface BookingDetail {
  id: string;
  booking_number: string;
  customer_name: string;
  service_type: string;
  status: string;
  pickup_date: string;
  pickup_time: string;
  pickup_address: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip_code: string;
  };
  delivery_address: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip_code: string;
  };
  special_instructions: string;
  coi_required: boolean;
  blade_airport?: string;
  blade_flight_date?: string;
  blade_flight_time?: string;
  blade_bag_count?: number;
  blade_ready_time?: string;
  total_price_dollars: number;
  pricing_breakdown: {
    base_price_dollars: number;
    surcharge_dollars: number;
    same_day_surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number;
    geographic_surcharge_dollars: number;
    time_window_surcharge_dollars: number;
    total_price_dollars: number;
    service_type: string;
  };
  payment_status: string;
  can_rebook: boolean;
  created_at: string;
  updated_at: string;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const bookingId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async (): Promise<BookingDetail> => {
      const response = await apiClient.get(`/api/customer/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: !!bookingId && isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
          <div className="text-navy-700">Loading booking details...</div>
        </div>
      </MainLayout>
    );
  }

  if (error || !booking) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-red-600 text-lg mb-4">Failed to load booking details</p>
                <Button onClick={() => router.push('/dashboard/bookings')}>
                  Back to Bookings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/bookings')}
              className="mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-navy-900">
                  Booking #{booking.booking_number}
                </h1>
                <p className="text-navy-600 mt-1">
                  {booking.service_type} • {new Date(booking.pickup_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-navy-900">Booking Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-navy-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-navy-700">Pickup Date</p>
                      <p className="text-navy-900">
                        {new Date(booking.pickup_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <ClockIcon className="h-5 w-5 text-navy-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-navy-700">Pickup Time</p>
                      <p className="text-navy-900">{booking.pickup_time}</p>
                    </div>
                  </div>
                </div>

                {booking.special_instructions && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-navy-700 mb-1">Special Instructions</p>
                    <p className="text-navy-600 text-sm">{booking.special_instructions}</p>
                  </div>
                )}

                {booking.coi_required && (
                  <div className="pt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      COI Required
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLADE Details */}
            {booking.service_type === 'BLADE Airport Transfer' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-navy-900">BLADE Flight Information</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-navy-700">Airport</p>
                      <p className="text-navy-900">{booking.blade_airport}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">Bag Count</p>
                      <p className="text-navy-900">{booking.blade_bag_count} bags</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">Flight Time</p>
                      <p className="text-navy-900">{booking.blade_flight_time}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">Ready Time</p>
                      <p className="text-navy-900">{booking.blade_ready_time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-navy-900">Locations</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center mb-2">
                    <MapPinIcon className="h-5 w-5 text-green-600 mr-2" />
                    <p className="font-semibold text-navy-900">Pickup Address</p>
                  </div>
                  <div className="ml-7 text-navy-700">
                    <p>{booking.pickup_address.address_line_1}</p>
                    {booking.pickup_address.address_line_2 && (
                      <p>{booking.pickup_address.address_line_2}</p>
                    )}
                    <p>
                      {booking.pickup_address.city}, {booking.pickup_address.state} {booking.pickup_address.zip_code}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center mb-2">
                    <MapPinIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="font-semibold text-navy-900">Delivery Address</p>
                  </div>
                  <div className="ml-7 text-navy-700">
                    <p>{booking.delivery_address.address_line_1}</p>
                    {booking.delivery_address.address_line_2 && (
                      <p>{booking.delivery_address.address_line_2}</p>
                    )}
                    <p>
                      {booking.delivery_address.city}, {booking.delivery_address.state} {booking.delivery_address.zip_code}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-navy-900">Pricing</h2>
                  <CurrencyDollarIcon className="h-6 w-6 text-navy-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-navy-600">Base Price</span>
                    <span className="text-navy-900 font-medium">
                      ${booking.pricing_breakdown.base_price_dollars.toFixed(2)}
                    </span>
                  </div>

                  {booking.pricing_breakdown.surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Surcharge</span>
                      <span className="text-navy-900 font-medium">
                        ${booking.pricing_breakdown.surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {booking.pricing_breakdown.same_day_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Same-Day Surcharge</span>
                      <span className="text-navy-900 font-medium">
                        ${booking.pricing_breakdown.same_day_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {booking.pricing_breakdown.coi_fee_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">COI Fee</span>
                      <span className="text-navy-900 font-medium">
                        ${booking.pricing_breakdown.coi_fee_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {booking.pricing_breakdown.organizing_total_dollars > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Organizing Services</span>
                        <span className="text-navy-900 font-medium">
                          ${booking.pricing_breakdown.organizing_total_dollars.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Organizing Tax</span>
                        <span className="text-navy-900 font-medium">
                          ${booking.pricing_breakdown.organizing_tax_dollars.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {booking.pricing_breakdown.geographic_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Distance Surcharge</span>
                      <span className="text-navy-900 font-medium">
                        ${booking.pricing_breakdown.geographic_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {booking.pricing_breakdown.time_window_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Time Window Surcharge</span>
                      <span className="text-navy-900 font-medium">
                        ${booking.pricing_breakdown.time_window_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t-2 border-navy-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-navy-900">Total</span>
                    <span className="text-2xl font-bold text-navy-900">
                      ${booking.total_price_dollars.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-navy-600">Payment Status</span>
                    <span className={`font-semibold capitalize ${getPaymentStatusColor(booking.payment_status)}`}>
                      {booking.payment_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Info Footer */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="text-xs text-navy-600 space-y-1">
                  <p><strong>Booked:</strong> {new Date(booking.created_at).toLocaleString()}</p>
                  {booking.updated_at !== booking.created_at && (
                    <p><strong>Last Updated:</strong> {new Date(booking.updated_at).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}