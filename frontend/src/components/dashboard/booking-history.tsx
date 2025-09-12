// frontend/src/components/dashboard/booking-history.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface Booking {
  id: string;
  booking_number: string;
  service_type: string;
  status: string;
  pickup_date: string;
  pickup_time?: string;
  pickup_address?: {
    address_line_1: string;
    city: string;
    state: string;
  };
  delivery_address?: {
    address_line_1: string;
    city: string;
    state: string;
  };
  total_price: number;
  created_at: string;
}

interface BookingHistoryResponse {
  bookings: Booking[];
  total_count: number;
}

export function BookingHistory() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', 'bookings', searchTerm, statusFilter],
    queryFn: async (): Promise<BookingHistoryResponse> => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await apiClient.get(`/api/customer/bookings/?${params}`);
      return response.data;
    },
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address?: Booking['pickup_address']) => {
    if (!address) return 'Address not available';
    return `${address.address_line_1}, ${address.city}, ${address.state}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Booking History</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">Failed to load booking history</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-navy-900">Booking History</h2>
          <div className="text-sm text-navy-600">
            {data?.total_count || 0} total bookings
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </CardHeader>

      <CardContent>
        {!data?.bookings || data.bookings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-navy-900 mb-2">No bookings yet</h3>
            <p className="text-navy-600 mb-4">
              Start your ToteTaxi experience by booking your first move
            </p>
            <Button variant="primary">
              Book Your First Move
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-cream-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-semibold text-navy-900">
                        #{booking.booking_number}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-navy-700">Service</p>
                        <p className="text-navy-600">{booking.service_type}</p>
                      </div>
                      <div>
                        <p className="font-medium text-navy-700">Date & Time</p>
                        <p className="text-navy-600">
                          {new Date(booking.pickup_date).toLocaleDateString()}
                          {booking.pickup_time && ` - ${booking.pickup_time}`}
                        </p>
                      </div>
                      {booking.pickup_address && (
                        <div>
                          <p className="font-medium text-navy-700">From</p>
                          <p className="text-navy-600">{formatAddress(booking.pickup_address)}</p>
                        </div>
                      )}
                      {booking.delivery_address && (
                        <div>
                          <p className="font-medium text-navy-700">To</p>
                          <p className="text-navy-600">{formatAddress(booking.delivery_address)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-navy-900 mb-2">
                      ${booking.total_price}
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alert('Booking details coming soon!')}
                      >
                        View Details
                      </Button>
                      {booking.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => alert('Rebook functionality coming soon!')}
                        >
                          Book Again
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}