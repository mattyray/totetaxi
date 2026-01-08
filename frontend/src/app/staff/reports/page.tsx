// frontend/src/app/staff/reports/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ReportsData {
  revenue: {
    total_all_time: number;
    last_30_days: number;
    average_booking_value: number;
    daily: Array<{ date: string; revenue: number }>;
    monthly: Array<{ month: string; revenue: number; count: number }>;
  };
  bookings: {
    total: number;
    by_status: {
      pending: number;
      confirmed: number;
      paid: number;
      completed: number;
      cancelled: number;
    };
    by_service: Array<{ service_type: string; count: number; revenue: number }>;
    daily: Array<{ date: string; count: number }>;
  };
  customers: {
    total: number;
    vip: number;
    new_last_30_days: number;
    top_customers: Array<{
      name: string;
      email: string;
      booking_count: number;
      total_spent: number;
      is_vip: boolean;
    }>;
  };
  performance: {
    completion_rate: number;
    cancellation_rate: number;
  };
  generated_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  mini_move: 'Mini Move',
  standard_delivery: 'Standard Delivery',
  specialty_item: 'Specialty Item',
  blade_transfer: 'BLADE Transfer',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SimpleBarChart({ data, valueKey, labelKey, color = 'bg-navy-600' }: {
  data: Array<Record<string, any>>;
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  if (!data || data.length === 0) {
    return <p className="text-navy-500 text-sm">No data available</p>;
  }

  const maxValue = Math.max(...data.map(d => d[valueKey] || 0));

  return (
    <div className="space-y-2">
      {data.slice(-10).map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-xs text-navy-600 w-20 truncate">
            {labelKey === 'date' ? new Date(item[labelKey]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : item[labelKey]}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{ width: `${maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium text-navy-900 w-16 text-right">
            {typeof item[valueKey] === 'number' && valueKey.includes('revenue')
              ? formatCurrency(item[valueKey])
              : item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StaffReportsPage() {
  const { isAuthenticated, isLoading: authLoading } = useStaffAuthStore();
  const router = useRouter();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['staff', 'reports'],
    queryFn: async (): Promise<ReportsData> => {
      const response = await apiClient.get('/api/staff/reports/');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <StaffLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-serif font-bold text-navy-900">Reports & Analytics</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </StaffLayout>
    );
  }

  if (error) {
    return (
      <StaffLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-serif font-bold text-navy-900">Reports & Analytics</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">Failed to load reports. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold text-navy-900">Reports & Analytics</h1>
          <p className="text-sm text-navy-500">
            Last updated: {reports ? new Date(reports.generated_at).toLocaleString() : '-'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-navy-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-navy-900">
                    {formatCurrency(reports?.revenue.total_all_time || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                Last 30 days: {formatCurrency(reports?.revenue.last_30_days || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-navy-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-navy-900">
                    {reports?.bookings.total || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                Avg value: {formatCurrency(reports?.revenue.average_booking_value || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-navy-600">Total Customers</p>
                  <p className="text-2xl font-bold text-navy-900">
                    {reports?.customers.total || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                VIP: {reports?.customers.vip || 0} | New (30d): {reports?.customers.new_last_30_days || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-navy-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-navy-900">
                    {reports?.performance.completion_rate || 0}%
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                Cancellation: {reports?.performance.cancellation_rate || 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Revenue */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-navy-900">Daily Revenue (Last 30 Days)</h3>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={reports?.revenue.daily || []}
                valueKey="revenue"
                labelKey="date"
                color="bg-green-500"
              />
            </CardContent>
          </Card>

          {/* Daily Bookings */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-navy-900">Daily Bookings (Last 30 Days)</h3>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={reports?.bookings.daily || []}
                valueKey="count"
                labelKey="date"
                color="bg-blue-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* Bookings Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bookings by Status */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-navy-900">Bookings by Status</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports?.bookings.by_status && Object.entries(reports.bookings.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        status === 'completed' ? 'bg-green-500' :
                        status === 'paid' ? 'bg-blue-500' :
                        status === 'confirmed' ? 'bg-yellow-500' :
                        status === 'pending' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      <span className="text-sm text-navy-700 capitalize">{status}</span>
                    </div>
                    <span className="text-sm font-semibold text-navy-900">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bookings by Service Type */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-navy-900">Revenue by Service</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports?.bookings.by_service?.map((service) => (
                  <div key={service.service_type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-navy-900">
                        {SERVICE_LABELS[service.service_type] || service.service_type}
                      </p>
                      <p className="text-xs text-navy-500">{service.count} bookings</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(service.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-navy-900">Top Customers</h3>
          </CardHeader>
          <CardContent>
            {reports?.customers.top_customers && reports.customers.top_customers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-navy-900">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-navy-900">Email</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-navy-900">Bookings</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-navy-900">Total Spent</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-navy-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.customers.top_customers.map((customer, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-navy-900">{customer.name}</td>
                        <td className="py-3 px-4 text-sm text-navy-600">{customer.email}</td>
                        <td className="py-3 px-4 text-sm text-navy-900 text-center">{customer.booking_count}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600 text-right">
                          {formatCurrency(customer.total_spent)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {customer.is_vip ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                              VIP
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Regular
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-navy-500 text-sm">No customer data available</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-navy-900">Monthly Revenue (Last 12 Months)</h3>
          </CardHeader>
          <CardContent>
            {reports?.revenue.monthly && reports.revenue.monthly.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-navy-900">Month</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-navy-900">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-navy-900">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.revenue.monthly.map((month, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-navy-900">
                          {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600 text-right">
                          {formatCurrency(month.revenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-navy-600 text-right">{month.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-navy-500 text-sm">No monthly data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
