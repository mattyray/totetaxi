// src/components/dashboard/dashboard-overview.tsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface DashboardData {
  customer_profile: {
    name: string;
    email: string;
    phone: string;
    is_vip: boolean;
    total_bookings: number;
    total_spent_dollars: number;
    last_booking_at: string | null;
  };
  booking_summary: {
    pending_bookings: number;
    completed_bookings: number;
    total_bookings: number;
  };
  recent_bookings: Array<{
    id: string;
    booking_number: string;
    customer_name: string;
    service_type: string;
    status: string;
    pickup_date: string;
    pickup_time: string;
    total_price_dollars: number;
    can_rebook: boolean;
    created_at: string;
  }>;
  saved_addresses_count: number;
  payment_methods_count: number;
}

export function DashboardOverview() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', 'dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const response = await apiClient.get('/api/customer/dashboard/');
      return response.data;
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Failed to load dashboard data</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = dashboardData?.customer_profile;
  const bookingSummary = dashboardData?.booking_summary;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Total Bookings</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy-900">
              {profile?.total_bookings || 0}
            </div>
            <p className="text-xs text-navy-600">
              {profile?.last_booking_at 
                ? `Last booking: ${new Date(profile.last_booking_at).toLocaleDateString()}`
                : 'No bookings yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Total Spent</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy-900">
              ${profile?.total_spent_dollars || 0}
            </div>
            <p className="text-xs text-navy-600">Lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Account Status</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {profile?.is_vip ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                  VIP Member
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-800">
                  Standard
                </span>
              )}
            </div>
            <p className="text-xs text-navy-600 mt-1">
              {profile?.is_vip 
                ? 'Priority scheduling & exclusive benefits'
                : 'Book 3+ moves to unlock VIP status'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Booking Summary */}
      {bookingSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-navy-900">{bookingSummary.pending_bookings}</div>
              <div className="text-sm text-navy-600">Pending Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-navy-900">{bookingSummary.completed_bookings}</div>
              <div className="text-sm text-navy-600">Completed Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-navy-900">{bookingSummary.total_bookings}</div>
              <div className="text-sm text-navy-600">Total Bookings</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Bookings */}
      {dashboardData?.recent_bookings && dashboardData.recent_bookings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-medium text-navy-900">Recent Bookings</h3>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard/bookings')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recent_bookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border border-cream-200 rounded-lg">
                  <div>
                    <p className="font-medium text-navy-900">#{booking.booking_number}</p>
                    <p className="text-sm text-navy-600">{booking.service_type}</p>
                    <p className="text-xs text-navy-500">
                      {new Date(booking.pickup_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-navy-900">${booking.total_price_dollars}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-navy-900">{dashboardData?.saved_addresses_count || 0}</div>
              <div className="text-sm text-navy-600">Saved Addresses</div>
            </div>
            <div>
              <div className="text-xl font-bold text-navy-900">{dashboardData?.payment_methods_count || 0}</div>
              <div className="text-sm text-navy-600">Payment Methods</div>
            </div>
            <div>
              <div className="text-xl font-bold text-navy-900">{bookingSummary?.pending_bookings || 0}</div>
              <div className="text-sm text-navy-600">Upcoming</div>
            </div>
            <div>
              <div className="text-xl font-bold text-navy-900">{bookingSummary?.completed_bookings || 0}</div>
              <div className="text-sm text-navy-600">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}