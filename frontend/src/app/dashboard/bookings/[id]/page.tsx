'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BookingWithTracking } from '@/types';
import { 
  ArrowLeftIcon, 
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

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

  const { data: booking, isLoading, error } = useQuery<BookingWithTracking>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/customer/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: isAuthenticated && !!bookingId
  });

  if (isLoading || !isAuthenticated) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !booking) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-red-600 mb-4">Failed to load booking details</p>
              <Button onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Unassigned</span>;
      case 'assigned':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Driver Assigned</span>;
      case 'active':
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            In Progress
          </span>
        );
      case 'completed':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Completed</span>;
      case 'failed':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Failed</span>;
      default:
        return null;
    }
  };

  const pickupTask = booking.onfleet_tasks?.find(t => t.task_type === 'pickup');
  const dropoffTask = booking.onfleet_tasks?.find(t => t.task_type === 'dropoff');
  const hasAnyActiveTask = booking.onfleet_tasks?.some(t => t.status === 'active') || false;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">
                Booking #{booking.booking_number}
              </h1>
              <p className="text-navy-600 mt-2">
                {booking.service_type.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {booking.onfleet_tasks && booking.onfleet_tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TruckIcon className="w-5 h-5 text-navy-600" />
                      <h3 className="text-lg font-medium text-navy-900">Delivery Tracking</h3>
                    </div>
                    {hasAnyActiveTask && (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Tracking Available
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <InformationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 text-sm mb-1">
                          📍 Live Tracking Information
                        </h4>
                        <p className="text-xs text-amber-800">
                          Tracking links become active when your driver starts each task. 
                          You&apos;ll receive SMS notifications when pickup and delivery begin.
                        </p>
                      </div>
                    </div>
                  </div>

                  {pickupTask && (
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-700 font-medium">📦 Pickup</span>
                            {getTaskStatusBadge(pickupTask.status)}
                          </div>
                          {pickupTask.worker_name && (
                            <p className="text-sm text-gray-600">Driver: {pickupTask.worker_name}</p>
                          )}
                        </div>
                        
                        {pickupTask.tracking_url && (
                          <a
                            href={pickupTask.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              pickupTask.status === 'active'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            Track Pickup →
                          </a>
                        )}
                      </div>
                      
                      {pickupTask.status === 'created' && (
                        <p className="text-xs text-gray-500 italic">
                          Waiting for driver assignment
                        </p>
                      )}
                      {pickupTask.status === 'assigned' && (
                        <p className="text-xs text-gray-500 italic">
                          Driver assigned. Tracking available once task starts.
                        </p>
                      )}
                      {pickupTask.status === 'active' && (
                        <p className="text-xs text-green-600 font-medium">
                          🚗 Driver is on the way! Click above for live tracking.
                        </p>
                      )}
                      {pickupTask.status === 'completed' && pickupTask.completed_at && (
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(pickupTask.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {dropoffTask && (
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-700 font-medium">
                              {booking.service_type === 'blade_transfer' ? '🚁 BLADE Delivery' : '🚚 Delivery'}
                            </span>
                            {getTaskStatusBadge(dropoffTask.status)}
                          </div>
                          {dropoffTask.worker_name && (
                            <p className="text-sm text-gray-600">Driver: {dropoffTask.worker_name}</p>
                          )}
                        </div>
                        
                        {dropoffTask.tracking_url && (
                          <a
                            href={dropoffTask.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              dropoffTask.status === 'active'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            Track Delivery →
                          </a>
                        )}
                      </div>
                      
                      {dropoffTask.status === 'created' && (
                        <p className="text-xs text-gray-500 italic">
                          Waiting for driver assignment
                        </p>
                      )}
                      {dropoffTask.status === 'assigned' && pickupTask?.status !== 'completed' && (
                        <p className="text-xs text-gray-500 italic">
                          Available after pickup is completed
                        </p>
                      )}
                      {dropoffTask.status === 'assigned' && pickupTask?.status === 'completed' && (
                        <p className="text-xs text-gray-500 italic">
                          Driver assigned. Tracking available once delivery starts.
                        </p>
                      )}
                      {dropoffTask.status === 'active' && (
                        <p className="text-xs text-green-600 font-medium">
                          🚗 Driver is delivering now! Click above for live tracking.
                        </p>
                      )}
                      {dropoffTask.status === 'completed' && dropoffTask.completed_at && (
                        <p className="text-xs text-gray-500">
                          Delivered: {new Date(dropoffTask.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>📱 SMS Notifications:</strong> You&apos;ll receive text updates when your driver 
                      starts pickup and delivery tasks.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Service Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CalendarIcon className="w-5 h-5 text-navy-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-navy-900">Pickup Date</p>
                    <p className="text-navy-700">
                      {new Date(booking.pickup_date + 'T00:00:00').toLocaleDateString('en-US', {        
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <ClockIcon className="w-5 h-5 text-navy-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-navy-900">Pickup Time</p>
                    <p className="text-navy-700">{booking.pickup_time}</p>
                  </div>
                </div>
                
                {booking.special_instructions && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-navy-900 mb-1">Special Instructions</p>
                    <p className="text-navy-700 text-sm">{booking.special_instructions}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {booking.coi_required && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                      COI Required
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Addresses</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPinIcon className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-navy-900">Pickup</h4>
                    </div>
                    <div className="text-navy-700 text-sm">
                      <p>{booking.pickup_address.address_line_1}</p>
                      {booking.pickup_address.address_line_2 && (
                        <p>{booking.pickup_address.address_line_2}</p>
                      )}
                      <p>
                        {booking.pickup_address.city}, {booking.pickup_address.state}{' '}
                        {booking.pickup_address.zip_code}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPinIcon className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-navy-900">
                        {booking.service_type === 'blade_transfer' ? 'BLADE Delivery' : 'Delivery'}
                      </h4>
                    </div>
                    <div className="text-navy-700 text-sm">
                      <p>{booking.delivery_address.address_line_1}</p>
                      {booking.delivery_address.address_line_2 && (
                        <p>{booking.delivery_address.address_line_2}</p>
                      )}
                      <p>
                        {booking.delivery_address.city}, {booking.delivery_address.state}{' '}
                        {booking.delivery_address.zip_code}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-navy-600" />
                  <h3 className="text-lg font-medium text-navy-900">Pricing</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {(booking.pricing_breakdown?.base_price_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Base Price:</span>
                      <span className="font-medium text-navy-900">
                        ${(booking.pricing_breakdown?.base_price_dollars ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {(booking.pricing_breakdown?.surcharge_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Surcharges:</span>
                      <span className="font-medium text-navy-900">
                        ${(booking.pricing_breakdown?.surcharge_dollars ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {(booking.pricing_breakdown?.coi_fee_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">COI Fee:</span>
                      <span className="font-medium text-navy-900">
                        ${(booking.pricing_breakdown?.coi_fee_dollars ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(booking.pricing_breakdown?.same_day_surcharge_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Same-Day Delivery:</span>
                      <span className="font-medium text-navy-900">
                        +${booking.pricing_breakdown.same_day_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(booking.pricing_breakdown?.organizing_total_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Organizing Services:</span>
                      <span className="font-medium text-navy-900">
                        +${booking.pricing_breakdown.organizing_total_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(booking.pricing_breakdown?.geographic_surcharge_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Geographic Surcharge:</span>
                      <span className="font-medium text-navy-900">
                        +${booking.pricing_breakdown.geographic_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(booking.pricing_breakdown?.time_window_surcharge_dollars ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-700">Time Window Surcharge:</span>
                      <span className="font-medium text-navy-900">
                        +${booking.pricing_breakdown.time_window_surcharge_dollars.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(booking.pricing_breakdown?.discount_amount_dollars ?? 0) > 0 && (
                    <>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-navy-700">Subtotal:</span>
                        <span className="font-medium text-navy-900">
                          ${booking.pricing_breakdown.pre_discount_total_dollars.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Discount ({booking.pricing_breakdown.discount_description || booking.pricing_breakdown.discount_code}):
                        </span>
                        <span className="font-medium text-green-700">
                          -${booking.pricing_breakdown.discount_amount_dollars.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className={`pt-2 mt-2 ${(booking.pricing_breakdown?.discount_amount_dollars ?? 0) > 0 ? '' : 'border-t'}`}>
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-navy-900">Total:</span>
                      <span className="font-bold text-navy-900">
                        ${booking.total_price_dollars.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-navy-600">
                    Booked on {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {booking.can_rebook && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/book?rebook=${booking.id}`)}
              >
                Book Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}