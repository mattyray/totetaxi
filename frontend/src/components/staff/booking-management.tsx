'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface BookingListItem {
  id: string;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  service_type: string;
  pickup_date: string;
  pickup_time: string;
  status: string;
  total_price_dollars: number;
  payment_status: string;
  created_at: string;
  coi_required: boolean;
}

interface BookingFilters {
  status?: string;
  date?: string;
  search?: string;
}

export function BookingManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BookingFilters>({});

  const { data: bookingData, isLoading, error } = useQuery({
    queryKey: ['staff', 'bookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      if (filters.search) params.append('search', filters.search);
      
      const response = await apiClient.get(`/api/staff/bookings/?${params}`);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, notes }: { bookingId: string; status: string; notes?: string }) => {
      const response = await apiClient.patch(`/api/staff/bookings/${bookingId}/`, {
        status,
        staff_notes: notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] });
    }
  });

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    const notes = prompt('Optional notes for this status change:');
    updateStatusMutation.mutate({ bookingId, status: newStatus, notes: notes || undefined });
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'paid', label: 'Paid' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
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
          <p className="text-red-600">Failed to load bookings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-navy-900">
          Booking Management
        </h1>
        <p className="text-navy-600">
          {bookingData?.total_count || 0} total bookings
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by booking #, name, or email"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              options={statusOptions}
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              placeholder="Filter by status"
            />
            <Input
              type="date"
              value={filters.date || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />
            <Button
              variant="outline"
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookingData?.bookings?.map((booking: BookingListItem) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                {/* Booking Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="font-semibold text-navy-900">
                      #{booking.booking_number}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      booking.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'paid'
                        ? 'bg-blue-100 text-blue-800'
                        : booking.status === 'confirmed'
                        ? 'bg-purple-100 text-purple-800'
                        : booking.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                    {booking.coi_required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        COI Required
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-navy-600">
                    <div>
                      <p><strong>Customer:</strong> {booking.customer_name}</p>
                      <p><strong>Email:</strong> {booking.customer_email}</p>
                      <p><strong>Service:</strong> {booking.service_type}</p>
                    </div>
                    <div>
                      <p><strong>Pickup Date:</strong> {new Date(booking.pickup_date).toLocaleDateString()}</p>
                      <p><strong>Pickup Time:</strong> {booking.pickup_time}</p>
                      <p><strong>Total:</strong> ${booking.total_price_dollars}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 lg:ml-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/staff/bookings/${booking.id}`)}
                  >
                    View Details
                  </Button>
                  
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <div className="flex space-x-2">
                      {booking.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Confirm
                        </Button>
                      )}
                      {(booking.status === 'confirmed' || booking.status === 'paid') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'completed')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookingData?.bookings?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-navy-600">No bookings found with current filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}