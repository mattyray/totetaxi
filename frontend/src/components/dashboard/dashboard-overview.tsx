// src/components/dashboard/dashboard-overview.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  CheckCircleIcon,
  UserCircleIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

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
    queryKey: ['customer', 'dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const response = await apiClient.get('/api/customer/dashboard/');
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = dashboardData?.customer_profile;
  const bookingSummary = dashboardData?.booking_summary;
  const recentBookings = dashboardData?.recent_bookings || [];

  return (
    <div className="space-y-6">
      {/* Key Stats - Clean 3-column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Bookings */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarIcon className="h-5 w-5 text-navy-500" />
              <span className="text-3xl font-bold text-navy-900">
                {profile?.total_bookings || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-navy-600">Total Bookings</p>
            {profile?.last_booking_at && (
              <p className="text-xs text-navy-500 mt-1">
                Last: {new Date(profile.last_booking_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-500" />
              <span className="text-3xl font-bold text-navy-900">
                {bookingSummary?.pending_bookings || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-navy-600">Upcoming</p>
            <p className="text-xs text-navy-500 mt-1">
              {bookingSummary?.completed_bookings || 0} completed
            </p>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <UserCircleIcon className="h-5 w-5 text-gold-500" />
              {profile?.is_vip ? (
                <span className="px-3 py-1 bg-gold-100 text-gold-800 rounded-full text-xs font-semibold">
                  VIP
                </span>
              ) : (
                <span className="px-3 py-1 bg-navy-100 text-navy-800 rounded-full text-xs font-semibold">
                  Standard
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-navy-600">Account Status</p>
            <p className="text-xs text-navy-500 mt-1">
              {profile?.is_vip 
                ? 'Priority access' 
                : `${3 - (profile?.total_bookings || 0)} more for VIP`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      {recentBookings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <h3 className="text-lg font-semibold text-navy-900">Recent Bookings</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/bookings')}
              className="text-navy-600 hover:text-navy-900"
            >
              View All
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBookings.slice(0, 3).map((booking) => (
              <div 
                key={booking.id} 
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => alert('Booking details coming soon!')}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-navy-900">
                      #{booking.booking_number}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      booking.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-navy-600">{booking.service_type}</p>
                  <p className="text-xs text-navy-500 mt-1">
                    {new Date(booking.pickup_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy-900">
                    ${booking.total_price_dollars}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recentBookings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-navy-900 mb-2">
              No bookings yet
            </h3>
            <p className="text-navy-600 mb-6">
              Ready to experience luxury moving?
            </p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => router.push('/book')}
            >
              Book Your First Move
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}