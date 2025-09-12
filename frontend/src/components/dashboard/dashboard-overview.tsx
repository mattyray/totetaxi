// frontend/src/components/dashboard/dashboard-overview.tsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  customer_stats: {
    total_bookings: number;
    total_spent_dollars: number;
    vip_status: boolean;
    last_booking_date: string | null;
  };
  recent_bookings: Array<{
    id: string;
    booking_number: string;
    service_type: string;
    status: string;
    pickup_date: string;
    total_price_dollars: number;
  }>;
}

export function DashboardOverview() {
  const { user, customerProfile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', 'dashboard'],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get('/api/customer/dashboard/');
      return response.data;
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0,    // Don't cache
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

  const stats = dashboardData?.customer_stats;

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
              {stats?.total_bookings || 0}
            </div>
            <p className="text-xs text-navy-600">
              {stats?.last_booking_date 
                ? `Last booking: ${new Date(stats.last_booking_date).toLocaleDateString()}`
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
              ${stats?.total_spent_dollars || 0}
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
              {stats?.vip_status ? (
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
              {stats?.vip_status 
                ? 'Priority scheduling & exclusive benefits'
                : 'Book 3+ moves to unlock VIP status'
              }
            </p>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}