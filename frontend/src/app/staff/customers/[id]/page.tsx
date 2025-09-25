'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CustomerDetailPage() {
  const { isAuthenticated, isLoading } = useStaffAuthStore();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const queryClient = useQueryClient();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['staff', 'customer', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/staff/customers/${customerId}/`);
      return response.data;
    },
    enabled: !!customerId && isAuthenticated
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await apiClient.patch(`/api/staff/customers/${customerId}/notes/`, {
        notes: newNotes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'customer', customerId] });
      setIsEditingNotes(false);
    }
  });

  useEffect(() => {
    if (customer?.notes) {
      setNotes(customer.notes);
    }
  }, [customer]);

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  if (isLoading || !isAuthenticated || customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-navy-900">Customer Not Found</h1>
          <p className="text-navy-600 mt-2">The requested customer could not be found.</p>
          <Button 
            variant="primary" 
            onClick={() => router.push('/staff/customers')}
            className="mt-4"
          >
            Back to Customers
          </Button>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy-900">{customer.name}</h1>
            <p className="text-navy-600 mt-1">{customer.email}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/staff/customers')}>
            ← Back to Customers
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-navy-900">Customer Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-navy-800"><strong className="text-navy-900">Name:</strong> {customer.name}</div>
              <div className="text-navy-800"><strong className="text-navy-900">Email:</strong> {customer.email}</div>
              <div className="text-navy-800"><strong className="text-navy-900">Phone:</strong> {customer.phone}</div>
              <div className="text-navy-800">
                <strong className="text-navy-900">VIP Status:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  customer.is_vip ? 'bg-gold-100 text-gold-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {customer.is_vip ? 'VIP Customer' : 'Standard Customer'}
                </span>
              </div>
              <div className="text-navy-800"><strong className="text-navy-900">Member Since:</strong> {new Date(customer.created_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>

          {/* Customer Stats */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-navy-900">Customer Stats</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-navy-50 rounded-lg">
                  <div className="text-2xl font-bold text-navy-900">{customer.total_bookings}</div>
                  <div className="text-sm text-navy-600">Total Bookings</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">${customer.total_spent_dollars}</div>
                  <div className="text-sm text-navy-600">Total Spent</div>
                </div>
              </div>
              {customer.last_booking_at && (
                <div className="text-navy-800">
                  <strong className="text-navy-900">Last Booking:</strong> {new Date(customer.last_booking_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Notes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-navy-900">Customer Notes</h3>
                {!isEditingNotes && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {customer.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this customer..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500 text-gray-900"
                  />
                  <div className="flex space-x-2">
                    <Button 
                      variant="primary" 
                      onClick={handleSaveNotes}
                      disabled={updateNotesMutation.isPending}
                    >
                      {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingNotes(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-navy-800">
                  {customer.notes || (
                    <em className="text-navy-500">No notes added yet. Click Edit to add customer notes.</em>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Addresses */}
          {customer.saved_addresses && customer.saved_addresses.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Saved Addresses</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.saved_addresses.map((address: any, index: number) => (
                    <div key={address.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-navy-800">
                        <div className="font-medium">Address {index + 1}</div>
                        <div>{address.address_line_1}</div>
                        {address.address_line_2 && <div>{address.address_line_2}</div>}
                        <div>{address.city}, {address.state} {address.zip_code}</div>
                        {address.is_primary && (
                          <div className="text-sm text-green-600 mt-1">Primary Address</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Bookings */}
          {customer.recent_bookings && customer.recent_bookings.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Recent Bookings</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customer.recent_bookings.map((booking: any) => (
                    <div key={booking.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-navy-900">{booking.booking_number}</div>
                        <div className="text-sm text-navy-600">
                          {booking.service_type} • {new Date(booking.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-navy-900">${booking.total_price_dollars}</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/staff/bookings/${booking.id}`)}
                      >
                        View Booking
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}