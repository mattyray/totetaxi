'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  MagnifyingGlassIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_vip: boolean;
  total_bookings: number;
  total_spent_dollars: number;
  last_booking_at: string | null;
  created_at: string;
  notes: string;
  recent_bookings: Array<{
    id: string;
    booking_number: string;
    service_type: string;
    status: string;
    total_price_dollars: number;
    created_at: string;
  }>;
  saved_addresses: Array<{
    id: string;
    address_line_1: string;
    city: string;
    state: string;
    is_primary: boolean;
  }>;
}

export function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [vipFilter, setVipFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['staff', 'customers', searchTerm, vipFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (vipFilter) params.append('vip', vipFilter);
      
      const response = await apiClient.get(`/api/staff/customers/?${params}`);
      return response.data;
    }
  });

  const { data: customerDetail } = useQuery({
    queryKey: ['staff', 'customer', selectedCustomer],
    queryFn: async (): Promise<CustomerProfile> => {
      const response = await apiClient.get(`/api/staff/customers/${selectedCustomer}/`);
      return response.data;
    },
    enabled: !!selectedCustomer
  });

  const vipOptions = [
    { value: '', label: 'All Customers' },
    { value: 'true', label: 'VIP Only' },
    { value: 'false', label: 'Standard Only' }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-navy-900">
          Customer Management
        </h1>
        <p className="text-navy-600">
          {customersData?.total_count || 0} customers
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={vipOptions}
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          {customersData?.customers?.map((customer: any) => (
            <Card 
              key={customer.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCustomer === customer.id ? 'ring-2 ring-navy-500' : ''
              }`}
              onClick={() => setSelectedCustomer(customer.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-navy-900">{customer.name}</h3>
                      {customer.is_vip && (
                        <StarIcon className="h-4 w-4 text-gold-500 fill-current" />
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-navy-600">
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="h-4 w-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-navy-900">
                      ${customer.total_spent_dollars?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-navy-600">
                      {customer.total_bookings || 0} bookings
                    </div>
                    {customer.last_booking_at && (
                      <div className="text-xs text-navy-500">
                        Last: {new Date(customer.last_booking_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customer Detail Panel */}
        <div className="space-y-6">
          {selectedCustomer && customerDetail ? (
            <CustomerDetailPanel customer={customerDetail} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Select a customer to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerDetailPanel({ customer }: { customer: CustomerProfile }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(customer.notes || '');
  const queryClient = useQueryClient();

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await apiClient.patch(`/api/customer/${customer.id}/notes/`, {
        notes
      });
      return response.data;
    },
    onSuccess: () => {
      // Refresh customer detail
      queryClient.invalidateQueries({ queryKey: ['staff', 'customer', customer.id] });
      setIsEditingNotes(false);
    },
    onError: (error) => {
      console.error('Failed to update notes:', error);
      alert('Failed to update notes. Please try again.');
    }
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notesValue);
  };

  const handleCancelNotes = () => {
    setNotesValue(customer.notes || '');
    setIsEditingNotes(false);
  };

  return (
    <div className="space-y-6">
      {/* Customer Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Customer Details</h3>
            {customer.is_vip && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                <StarIcon className="h-3 w-3 mr-1 fill-current" />
                VIP Member
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-navy-900">{customer.name}</h4>
            <p className="text-sm text-navy-600">{customer.email}</p>
            {customer.phone && <p className="text-sm text-navy-600">{customer.phone}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-navy-900">{customer.total_bookings}</div>
              <div className="text-sm text-navy-600">Total Bookings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${customer.total_spent_dollars?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-navy-600">Total Spent</div>
            </div>
          </div>
          
          <div className="text-sm text-navy-600">
            <strong>Member since:</strong> {new Date(customer.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Staff Notes - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Staff Notes</h3>
            {!isEditingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingNotes(true)}
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes about customer preferences, special requests, VIP details, etc."
                className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[100px] text-navy-900"
                rows={4}
              />
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isPending}
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelNotes}
                  disabled={updateNotesMutation.isPending}
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-[60px]">
              {customer.notes ? (
                <p className="text-navy-700 whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <p className="text-gray-500 italic">No notes added yet. Click Edit to add customer notes.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Recent Bookings</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customer.recent_bookings?.slice(0, 5).map(booking => (
              <div key={booking.id} className="flex justify-between items-center p-3 bg-cream-50 rounded-lg">
                <div>
                  <div className="font-medium text-navy-900">#{booking.booking_number}</div>
                  <div className="text-sm text-navy-600">{booking.service_type}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${booking.total_price_dollars}</div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Addresses */}
      {customer.saved_addresses?.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Saved Addresses</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customer.saved_addresses.map(address => (
                <div key={address.id} className="flex items-start space-x-3 p-3 bg-cream-50 rounded-lg">
                  <MapPinIcon className="h-4 w-4 text-navy-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-navy-900">{address.address_line_1}</div>
                    <div className="text-sm text-navy-600">
                      {address.city}, {address.state}
                    </div>
                    {address.is_primary && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-800 mt-1">
                        Primary
                      </span>
                    )}
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