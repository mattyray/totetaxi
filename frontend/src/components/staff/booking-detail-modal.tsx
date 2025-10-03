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

interface ServiceDetails {
  mini_move?: {
    package_name: string;
    package_type: string;
    description: string;
    max_items: number | null;
    max_weight_per_item_lbs: number;
    coi_included: boolean;
    priority_scheduling: boolean;
    protective_wrapping: boolean;
    base_price_dollars: number;
  };
  organizing_services?: {
    include_packing: boolean;
    include_unpacking: boolean;
    breakdown?: any;
  };
  specialty_items?: Array<{
    id: string;
    name: string;
    item_type: string;
    description: string;
    price_dollars: number;
    special_handling: boolean;
  }>;
  standard_delivery?: {
    item_count: number;
    is_same_day: boolean;
  };
  blade_transfer?: {
    airport: string;
    flight_date: string;
    flight_time: string;
    bag_count: number;
    ready_time: string;
  };
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
    service_type_display: string;
    status: string;
    pickup_date: string;
    pickup_time: string;
    pickup_time_display: string;
    pickup_address: Address;
    delivery_address: Address;
    special_instructions: string;
    coi_required: boolean;
    is_outside_core_area: boolean;
    total_price_dollars: number;
    organizing_total_dollars?: number;
    pricing_breakdown: any;
    service_details: ServiceDetails;
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

  const serviceDetails = bookingDetail.booking.service_details;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl" 
      title={`Booking ${bookingDetail.booking.booking_number}`}
      description={`${bookingDetail.booking.service_type_display} • ${bookingDetail.customer?.name || 'Guest'}`}
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
                  value={bookingDetail.booking.service_type_display}
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

              <div className="flex items-center space-x-4">
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
                {bookingDetail.booking.is_outside_core_area && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    Outside Core Area
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="text-sm text-navy-600 mb-4">
                <strong className="text-navy-900">Service Type:</strong> {bookingDetail.booking.service_type_display}
              </div>

              {/* Mini Move Details */}
              {serviceDetails.mini_move && (
                <Card>
                  <CardHeader>
                    <h4 className="font-medium text-navy-900">Mini Move Package</h4>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Package:</strong> {serviceDetails.mini_move.package_name}</div>
                    <div><strong>Description:</strong> {serviceDetails.mini_move.description}</div>
                    <div><strong>Max Items:</strong> {serviceDetails.mini_move.max_items || 'Unlimited'}</div>
                    <div><strong>Max Weight per Item:</strong> {serviceDetails.mini_move.max_weight_per_item_lbs} lbs</div>
                    <div><strong>Base Price:</strong> ${serviceDetails.mini_move.base_price_dollars}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {serviceDetails.mini_move.coi_included && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">COI Included</span>
                      )}
                      {serviceDetails.mini_move.priority_scheduling && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Priority Scheduling</span>
                      )}
                      {serviceDetails.mini_move.protective_wrapping && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Protective Wrapping</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Organizing Services */}
              {serviceDetails.organizing_services && (
                <Card>
                  <CardHeader>
                    <h4 className="font-medium text-navy-900">Organizing Services</h4>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {serviceDetails.organizing_services.include_packing && (
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Professional Packing Service</span>
                      </div>
                    )}
                    {serviceDetails.organizing_services.include_unpacking && (
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Professional Unpacking Service</span>
                      </div>
                    )}
                    {bookingDetail.booking.organizing_total_dollars && (
                      <div className="mt-2 pt-2 border-t">
                        <strong>Organizing Total:</strong> ${bookingDetail.booking.organizing_total_dollars}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Specialty Items */}
              {serviceDetails.specialty_items && serviceDetails.specialty_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <h4 className="font-medium text-navy-900">Specialty Items</h4>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {serviceDetails.specialty_items.map((item) => (
                      <div key={item.id} className="border-b border-gray-200 pb-3 last:border-0">
                        <div className="font-medium text-navy-900">{item.name}</div>
                        <div className="text-sm text-navy-600">{item.description}</div>
                        <div className="text-sm mt-1">
                          <strong>Price:</strong> ${item.price_dollars}
                          {item.special_handling && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                              Special Handling
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Standard Delivery */}
              {serviceDetails.standard_delivery && (
                <Card>
                  <CardHeader>
                    <h4 className="font-medium text-navy-900">Standard Delivery</h4>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Item Count:</strong> {serviceDetails.standard_delivery.item_count}</div>
                    {serviceDetails.standard_delivery.is_same_day && (
                      <div className="text-orange-600 font-medium">Same-Day Delivery</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* BLADE Transfer */}
              {serviceDetails.blade_transfer && (
                <Card>
                  <CardHeader>
                    <h4 className="font-medium text-navy-900">BLADE Airport Transfer</h4>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Airport:</strong> {serviceDetails.blade_transfer.airport}</div>
                    <div><strong>Flight Date:</strong> {new Date(serviceDetails.blade_transfer.flight_date).toLocaleDateString()}</div>
                    <div><strong>Flight Time:</strong> {serviceDetails.blade_transfer.flight_time}</div>
                    <div><strong>Bag Count:</strong> {serviceDetails.blade_transfer.bag_count}</div>
                    {serviceDetails.blade_transfer.ready_time && (
                      <div><strong>Ready Time:</strong> {serviceDetails.blade_transfer.ready_time}</div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-navy-900">Pickup Address</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-navy-800">
                    <div>{bookingDetail.booking.pickup_address.address_line_1}</div>
                    {bookingDetail.booking.pickup_address.address_line_2 && (
                      <div>{bookingDetail.booking.pickup_address.address_line_2}</div>
                    )}
                    <div>
                      {bookingDetail.booking.pickup_address.city}, {bookingDetail.booking.pickup_address.state} {bookingDetail.booking.pickup_address.zip_code}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-navy-900">Delivery Address</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-navy-800">
                    <div>{bookingDetail.booking.delivery_address.address_line_1}</div>
                    {bookingDetail.booking.delivery_address.address_line_2 && (
                      <div>{bookingDetail.booking.delivery_address.address_line_2}</div>
                    )}
                    <div>
                      {bookingDetail.booking.delivery_address.city}, {bookingDetail.booking.delivery_address.state} {bookingDetail.booking.delivery_address.zip_code}
                    </div>
                  </div>
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
                <div className="space-y-3">
                  <div className="flex justify-between text-lg font-semibold border-b pb-2">
                    <span>Total:</span>
                    <span>${bookingDetail.booking.total_price_dollars}</span>
                  </div>
                  
                  {bookingDetail.booking.pricing_breakdown && (
                    <div className="space-y-2 text-sm">
                      {Object.entries(bookingDetail.booking.pricing_breakdown).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-navy-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-navy-900">${value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-navy-600 pt-3 border-t">
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