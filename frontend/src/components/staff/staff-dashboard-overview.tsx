'use client';
// frontend/src/components/staff/staff-dashboard-overview.tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface StaffDashboardData {
  staff_info: {
    name: string;
    role: string;
    permissions: {
      can_approve_refunds: boolean;
      can_manage_staff: boolean;
      can_view_financial_reports: boolean;
    };
  };
  booking_stats: {
    total_bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    paid_bookings: number;
    completed_bookings: number;
  };
  payment_stats: {
    total_payments: number;
    pending_payments: number;
    failed_payments: number;
    total_revenue_dollars: number;
  };
  customer_stats: {
    total_customers: number;
    vip_customers: number;
  };
  urgent_bookings: Array<{
    id: string;
    booking_number: string;
    customer_name: string;
    customer_email: string;
    service_type: string;
    pickup_date: string;
    status: string;
    total_price_dollars: number;
    created_at: string;
  }>;
}

export function StaffDashboardOverview() {
  const { staffProfile } = useStaffAuthStore();
  const router = useRouter();

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'dashboard'],
    queryFn: async (): Promise<StaffDashboardData> => {
      const response = await apiClient.get('/api/staff/dashboard/');
      return response.data;
    },
    enabled: !!staffProfile,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
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

  const bookingStats = dashboardData?.booking_stats;
  const paymentStats = dashboardData?.payment_stats;
  const customerStats = dashboardData?.customer_stats;

  // Helper function for payment success rate calculation
  const calculateSuccessRate = () => {
    if (!paymentStats) return '0%';
    const { total_payments = 0, failed_payments = 0 } = paymentStats;
    if (total_payments === 0 && failed_payments === 0) return '0%';
    const successRate = Math.round((total_payments / (total_payments + failed_payments)) * 100);
    return `${successRate}%`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-900">
            Operations Dashboard
          </h1>
          <p className="text-navy-600">
            Welcome back, {dashboardData?.staff_info?.name || 'Staff'} ({dashboardData?.staff_info?.role || 'staff'})
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/staff/bookings')}
          >
            All Bookings
          </Button>
          <Button 
            variant="primary"
            onClick={() => refetch()}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Booking Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Total Bookings</h3>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">
              {bookingStats?.total_bookings || 0}
            </div>
            <p className="text-xs text-navy-600">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Pending Actions</h3>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {(bookingStats?.pending_bookings || 0) + (bookingStats?.confirmed_bookings || 0)}
            </div>
            <p className="text-xs text-navy-600">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">Revenue</h3>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${paymentStats?.total_revenue_dollars?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-navy-600">Total processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-navy-600">VIP Customers</h3>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gold-600">
              {customerStats?.vip_customers || 0}
            </div>
            <p className="text-xs text-navy-600">
              of {customerStats?.total_customers || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-navy-900">Booking Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Pending</span>
                <span className="font-medium text-amber-600">
                  {bookingStats?.pending_bookings || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Confirmed</span>
                <span className="font-medium text-blue-600">
                  {bookingStats?.confirmed_bookings || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Paid</span>
                <span className="font-medium text-green-600">
                  {bookingStats?.paid_bookings || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Completed</span>
                <span className="font-medium text-navy-900">
                  {bookingStats?.completed_bookings || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-navy-900">Payment Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Processed</span>
                <span className="font-medium text-green-600">
                  {paymentStats?.total_payments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Pending</span>
                <span className="font-medium text-amber-600">
                  {paymentStats?.pending_payments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Failed</span>
                <span className="font-medium text-red-600">
                  {paymentStats?.failed_payments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-navy-600">Success Rate</span>
                <span className="font-medium text-navy-900">
                  {calculateSuccessRate()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Bookings */}
      {dashboardData?.urgent_bookings && dashboardData.urgent_bookings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-medium text-navy-900">Bookings Needing Attention</h3>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/staff/bookings?filter=urgent')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.urgent_bookings.slice(0, 5).map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 border border-cream-200 rounded-lg hover:bg-cream-50 cursor-pointer"
                  onClick={() => router.push(`/staff/bookings/${booking.id}`)}
                >
                  <div>
                    <p className="font-medium text-navy-900">
                      #{booking.booking_number}
                    </p>
                    <p className="text-sm text-navy-600">
                      {booking.customer_name} - {booking.service_type}
                    </p>
                    <p className="text-xs text-navy-500">
                      Pickup: {new Date(booking.pickup_date + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-navy-900">
                      ${booking.total_price_dollars}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'pending' 
                        ? 'bg-amber-100 text-amber-800'
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