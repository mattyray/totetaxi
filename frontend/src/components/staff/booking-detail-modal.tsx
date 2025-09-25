// src/components/staff/booking-detail-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface BookingDetailModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Address {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
}

interface BookingFormData {
  status: string;
  pickup_date: string;
  pickup_time: string;
  special_instructions: string;
  coi_required: boolean;
  pickup_address: Address;
  delivery_address: Address;
}

interface BookingDetail {
  booking: {
    id: string;
    booking_number: string;
    service_type: string;
    status: string;
    pickup_date: string;
    pickup_time: string;
    pickup_address: Address;
    delivery_address: Address;
    special_instructions: string;
    coi_required: boolean;
    total_price_dollars: number;
    pricing_breakdown: any;
    created_at: string;
    updated_at: string;
  };
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    is_vip: boolean;
  };
  guest_checkout?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  payment?: {
    id: string;
    status: string;
    amount_dollars: number;
  };
}

export function BookingDetailModal({ bookingId, isOpen, onClose }: BookingDetailModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<BookingFormData>({
    status: '',
    pickup_date: '',
    pickup_time: '',
    special_instructions: '',
    coi_required: false,
    pickup_address: {
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: ''
    },
    delivery_address: {
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: ''
    }
  });
  
  const queryClient = useQueryClient();

  const { data: bookingDetail, isLoading } = useQuery({
    queryKey: ['staff', 'booking', bookingId],
    queryFn: async (): Promise<BookingDetail> => {
      const response = await apiClient.get(`/api/staff/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: isOpen && !!bookingId,
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (updates: Partial<BookingFormData>) => {
      const response = await apiClient.patch(`/api/staff/bookings/${bookingId}/`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['calendar', 'availability'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
    }
  });

  useEffect(() => {
    if (bookingDetail) {
      setFormData({
        status: bookingDetail.booking.status,
        pickup_date: bookingDetail.booking.pickup_date,
        pickup_time: bookingDetail.booking.pickup_time,
        special_instructions: bookingDetail.booking.special_instructions || '',
        coi_required: bookingDetail.booking.coi_required,
        pickup_address: { ...bookingDetail.booking.pickup_address },
        delivery_address: { ...bookingDetail.booking.delivery_address },
      });
    }
  }, [bookingDetail]);

  const handleSave = () => {
    // Only send changed fields
    const updates: Partial<BookingFormData> = {};
    if (formData.status !== bookingDetail?.booking.status) {
      updates.status = formData.status;
    }
    if (Object.keys(updates).length > 0) {
      updateBookingMutation.mutate(updates);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'paid', label: 'Paid' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const pickupTimeOptions = [
    { value: 'morning', label: '8 AM - 11 AM' },
    { value: 'morning_specific', label: 'Specific 1-hour window' },
    { value: 'no_time_preference', label: 'No time preference' },
  ];

  const stateOptions = [
    { value: 'NY', label: 'New York' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'NJ', label: 'New Jersey' },
  ];

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'services', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'customer', label: 'Customer' },
  ];

  if (isLoading || !bookingDetail) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl" 
      title={`Booking ${bookingDetail.booking.booking_number}`}
      description={`${bookingDetail.booking.service_type} • ${bookingDetail.customer?.name || 'Guest'}`}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-navy-500 text-navy-600'
                    : 'border-transparent text-navy-500 hover:text-navy-700 hover:border-navy-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(e) => setFormData((prev: BookingFormData) => ({ ...prev, status: e.target.value }))}
                />
                <Input
                  label="Service Type"
                  value={bookingDetail.booking.service_type}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Pickup Date"
                  type="date"
                  value={formData.pickup_date}
                  onChange={(e) => setFormData((prev: BookingFormData) => ({ ...prev, pickup_date: e.target.value }))}
                />
                <Select
                  label="Pickup Time"
                  options={pickupTimeOptions}
                  value={formData.pickup_time}
                  onChange={(e) => setFormData((prev: BookingFormData) => ({ ...prev, pickup_time: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData((prev: BookingFormData) => ({ ...prev, special_instructions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500 text-gray-900"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="coi_required"
                  checked={formData.coi_required}
                  onChange={(e) => setFormData((prev: BookingFormData) => ({ ...prev, coi_required: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="coi_required" className="text-sm text-navy-900">
                  COI Required
                </label>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-navy-900">Pickup Address</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Street Address"
                    value={formData.pickup_address.address_line_1}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      pickup_address: { ...prev.pickup_address, address_line_1: e.target.value }
                    }))}
                  />
                  <Input
                    label="Apartment, Suite, etc."
                    value={formData.pickup_address.address_line_2}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      pickup_address: { ...prev.pickup_address, address_line_2: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={formData.pickup_address.city}
                      onChange={(e) => setFormData((prev: BookingFormData) => ({
                        ...prev,
                        pickup_address: { ...prev.pickup_address, city: e.target.value }
                      }))}
                    />
                    <Select
                      label="State"
                      options={stateOptions}
                      value={formData.pickup_address.state}
                      onChange={(e) => setFormData((prev: BookingFormData) => ({
                        ...prev,
                        pickup_address: { ...prev.pickup_address, state: e.target.value }
                      }))}
                    />
                  </div>
                  <Input
                    label="ZIP Code"
                    value={formData.pickup_address.zip_code}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      pickup_address: { ...prev.pickup_address, zip_code: e.target.value }
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-navy-900">Delivery Address</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Street Address"
                    value={formData.delivery_address.address_line_1}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      delivery_address: { ...prev.delivery_address, address_line_1: e.target.value }
                    }))}
                  />
                  <Input
                    label="Apartment, Suite, etc."
                    value={formData.delivery_address.address_line_2}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      delivery_address: { ...prev.delivery_address, address_line_2: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={formData.delivery_address.city}
                      onChange={(e) => setFormData((prev: BookingFormData) => ({
                        ...prev,
                        delivery_address: { ...prev.delivery_address, city: e.target.value }
                      }))}
                    />
                    <Select
                      label="State"
                      options={stateOptions}
                      value={formData.delivery_address.state}
                      onChange={(e) => setFormData((prev: BookingFormData) => ({
                        ...prev,
                        delivery_address: { ...prev.delivery_address, state: e.target.value }
                      }))}
                    />
                  </div>
                  <Input
                    label="ZIP Code"
                    value={formData.delivery_address.zip_code}
                    onChange={(e) => setFormData((prev: BookingFormData) => ({
                      ...prev,
                      delivery_address: { ...prev.delivery_address, zip_code: e.target.value }
                    }))}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-4">
              {bookingDetail.customer ? (
                <Card>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {bookingDetail.customer.name}</p>
                      <p><strong>Email:</strong> {bookingDetail.customer.email}</p>
                      <p><strong>Phone:</strong> {bookingDetail.customer.phone}</p>
                      <p><strong>VIP Status:</strong> {bookingDetail.customer.is_vip ? 'Yes' : 'No'}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : bookingDetail.guest_checkout ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-medium text-navy-900">Guest Customer</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {bookingDetail.guest_checkout.first_name} {bookingDetail.guest_checkout.last_name}</p>
                      <p><strong>Email:</strong> {bookingDetail.guest_checkout.email}</p>
                      <p><strong>Phone:</strong> {bookingDetail.guest_checkout.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p>No customer information available</p>
              )}
            </div>
          )}

          {activeTab === 'pricing' && (
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">${bookingDetail.booking.total_price_dollars}</span>
                  </div>
                  <div className="text-sm text-navy-600">
                    <p>Created: {new Date(bookingDetail.booking.created_at).toLocaleString()}</p>
                    <p>Updated: {new Date(bookingDetail.booking.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={updateBookingMutation.isPending}
          >
            {updateBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}