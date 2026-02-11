'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { RefundModal } from '@/components/staff/refund-modal';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Payment, Refund } from '@/types';

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
    packing_service?: {
      name: string;
      price_dollars: number;
      duration_hours: number;
      organizer_count: number;
      supplies_allowance: number;
    };
    unpacking_service?: {
      name: string;
      price_dollars: number;
      duration_hours: number;
      organizer_count: number;
      supplies_allowance: number;
    };
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
    item_description?: string;
  };
  blade_transfer?: {
    airport: string;
    flight_date: string;
    flight_time: string;
    bag_count: number;
    ready_time: string;
    per_bag_price: number;
    transfer_direction?: string;
    terminal?: string;
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

export default function BookingDetailPage() {
  const { isAuthenticated, isLoading } = useStaffAuthStore();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['staff', 'booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/staff/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: !!bookingId && isAuthenticated
  });

  const { data: refundsData } = useQuery({
    queryKey: ['staff', 'refunds', bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/payments/refunds/?booking_id=${bookingId}`);
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    },
    enabled: !!bookingId && isAuthenticated && !!booking?.payment
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (updates: Partial<BookingFormData>) => {
      const response = await apiClient.patch(`/api/staff/bookings/${bookingId}/`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'booking', bookingId] });
      setIsEditing(false);
    }
  });

  useEffect(() => {
    if (booking?.booking) {
      setFormData({
        status: booking.booking.status || '',
        pickup_date: booking.booking.pickup_date || '',
        pickup_time: booking.booking.pickup_time || '',
        special_instructions: booking.booking.special_instructions || '',
        coi_required: booking.booking.coi_required || false,
        pickup_address: booking.booking.pickup_address || {
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          zip_code: ''
        },
        delivery_address: booking.booking.delivery_address || {
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          zip_code: ''
        }
      });
    }
  }, [booking]);

  const handleSave = () => {
    const updates: Partial<BookingFormData> = {};
    if (formData.status !== booking?.booking?.status) updates.status = formData.status;
    if (formData.pickup_date !== booking?.booking?.pickup_date) updates.pickup_date = formData.pickup_date;
    if (formData.pickup_time !== booking?.booking?.pickup_time) updates.pickup_time = formData.pickup_time;
    if (formData.special_instructions !== booking?.booking?.special_instructions) updates.special_instructions = formData.special_instructions;
    if (formData.coi_required !== booking?.booking?.coi_required) updates.coi_required = formData.coi_required;

    if (Object.keys(updates).length > 0) {
      updateBookingMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'bg-green-100 text-green-800';
      case 'partially_refunded': return 'bg-orange-100 text-orange-800';
      case 'refunded': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (isLoading || !isAuthenticated || bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  const serviceDetails: ServiceDetails = booking?.booking?.service_details || {};

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-navy-900">
              Booking #{booking?.booking?.booking_number}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(booking?.booking?.status)}`}>
                {booking?.booking?.status}
              </span>
              {booking?.payment && (
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.payment.status)}`}>
                  {booking.payment.status === 'refunded' ? '↩️ Refunded' :
                   booking.payment.status === 'partially_refunded' ? '↩️ Partial Refund' :
                   booking.payment.status === 'succeeded' ? '✓ Paid' :
                   booking.payment.status}
                </span>
              )}
              <span className="text-navy-600">
                {booking?.booking?.service_type_display} • ${booking?.booking?.total_price_dollars}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                Edit Booking
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={updateBookingMutation.isPending}
                >
                  {updateBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={() => router.back()}>
              ← Back
            </Button>
          </div>
        </div>

        {booking && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Details with Schedule */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Service Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <strong className="text-navy-900">Service Type:</strong> 
                  <span className="ml-2 text-navy-800">{booking.booking?.service_type_display}</span>
                </div>

                {/* Schedule Section */}
                <div className="border-t pt-3 space-y-2">
                  <div className="font-semibold text-navy-900 text-sm">Schedule</div>
                  {isEditing ? (
                    <>
                      <Input
                        label="Pickup Date"
                        type="date"
                        value={formData.pickup_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
                      />
                      <Select
                        label="Pickup Time"
                        options={pickupTimeOptions}
                        value={formData.pickup_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_time: e.target.value }))}
                      />
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-1">
                          Special Instructions
                        </label>
                        <textarea
                          value={formData.special_instructions}
                          onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500 text-gray-900"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="coi_required"
                          checked={formData.coi_required}
                          onChange={(e) => setFormData(prev => ({ ...prev, coi_required: e.target.checked }))}
                          className="mr-2"
                        />
                        <label htmlFor="coi_required" className="text-sm text-navy-900">
                          COI Required
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-navy-800"><strong className="text-navy-900">Date:</strong> {new Date(booking.booking?.pickup_date + 'T00:00:00').toLocaleDateString()}</div>
                      {booking.booking?.special_instructions && (
                        <div className="text-sm text-navy-800"><strong className="text-navy-900">Instructions:</strong> {booking.booking.special_instructions}</div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {booking.booking?.coi_required && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">COI Required</span>
                        )}
                        {booking.booking?.is_outside_core_area && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">Outside Core Area</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Mini Move Details */}
                {serviceDetails.mini_move && (
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="font-semibold text-navy-900">Mini Move Package: {serviceDetails.mini_move.package_name}</div>
                    <div className="text-navy-700">{serviceDetails.mini_move.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-navy-600 mt-2">
                      <div>Max Items: {serviceDetails.mini_move.max_items || 'Unlimited'}</div>
                      <div>Max Weight: {serviceDetails.mini_move.max_weight_per_item_lbs} lbs</div>
                      <div>Base Price: ${serviceDetails.mini_move.base_price_dollars}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {serviceDetails.mini_move.coi_included && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">COI Included</span>
                      )}
                      {serviceDetails.mini_move.priority_scheduling && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Priority</span>
                      )}
                      {serviceDetails.mini_move.protective_wrapping && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Protected</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Organizing Services */}
                {serviceDetails.organizing_services && (
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="font-semibold text-navy-900">Organizing Services</div>
                    
                    {serviceDetails.organizing_services.packing_service && (
                      <div className="bg-green-50 p-2 rounded space-y-1">
                        <div className="flex items-center text-green-700 font-medium">
                          <span className="mr-2">✓</span> {serviceDetails.organizing_services.packing_service.name}
                        </div>
                        <div className="text-xs text-navy-600 ml-5">
                          ${serviceDetails.organizing_services.packing_service.price_dollars} • 
                          {serviceDetails.organizing_services.packing_service.duration_hours}h • 
                          {serviceDetails.organizing_services.packing_service.organizer_count} organizer(s)
                        </div>
                      </div>
                    )}
                    
                    {serviceDetails.organizing_services.unpacking_service && (
                      <div className="bg-green-50 p-2 rounded space-y-1">
                        <div className="flex items-center text-green-700 font-medium">
                          <span className="mr-2">✓</span> {serviceDetails.organizing_services.unpacking_service.name}
                        </div>
                        <div className="text-xs text-navy-600 ml-5">
                          ${serviceDetails.organizing_services.unpacking_service.price_dollars} • 
                          {serviceDetails.organizing_services.unpacking_service.duration_hours}h • 
                          {serviceDetails.organizing_services.unpacking_service.organizer_count} organizer(s)
                        </div>
                      </div>
                    )}
                    
                    {booking.booking?.organizing_total_dollars && (
                      <div className="text-navy-800 font-medium mt-2">
                        Total: ${booking.booking.organizing_total_dollars}
                      </div>
                    )}
                  </div>
                )}

                {/* Specialty Items */}
                {serviceDetails.specialty_items && serviceDetails.specialty_items.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-semibold text-navy-900 text-sm">Specialty Items</div>
                    {serviceDetails.specialty_items.map((item) => (
                      <div key={item.id} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-sm text-navy-900">{item.name}</div>
                        <div className="text-xs text-navy-600">{item.description}</div>
                        <div className="text-xs mt-1 flex justify-between items-center">
                          <span className="font-semibold text-navy-900">${item.price_dollars}</span>
                          {item.special_handling && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Special Handling</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Standard Delivery */}
                {serviceDetails.standard_delivery && (
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="font-semibold text-navy-900">Standard Delivery</div>
                    <div className="text-navy-800">Item Count: {serviceDetails.standard_delivery.item_count}</div>
                    {serviceDetails.standard_delivery.item_description && (
                      <div className="text-navy-800">Items: {serviceDetails.standard_delivery.item_description}</div>
                    )}
                    {serviceDetails.standard_delivery.is_same_day && (
                      <div className="text-orange-600 font-medium">Same-Day Delivery</div>
                    )}
                  </div>
                )}

                {/* Airport Transfer */}
                {serviceDetails.blade_transfer && (
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="font-semibold text-navy-900">Airport Transfer</div>
                    <div className="space-y-1 text-navy-800">
                      <div>
                        Direction:{' '}
                        <strong>
                          {serviceDetails.blade_transfer.transfer_direction === 'from_airport'
                            ? 'Airport to NYC (Arrival Pickup)'
                            : 'NYC to Airport (Departure Drop-off)'}
                        </strong>
                      </div>
                      <div>
                        Airport: <strong>{serviceDetails.blade_transfer.airport}</strong>
                        {serviceDetails.blade_transfer.terminal && ` — Terminal ${serviceDetails.blade_transfer.terminal}`}
                      </div>
                      <div>Flight Date: {new Date(serviceDetails.blade_transfer.flight_date + 'T00:00:00').toLocaleDateString()}</div>
                      <div>
                        {serviceDetails.blade_transfer.transfer_direction === 'from_airport' ? 'Arrival Time' : 'Departure Time'}:{' '}
                        {serviceDetails.blade_transfer.flight_time}
                      </div>
                      <div>Bags: {serviceDetails.blade_transfer.bag_count} @ ${serviceDetails.blade_transfer.per_bag_price}/bag</div>
                      {serviceDetails.blade_transfer.transfer_direction !== 'from_airport' && serviceDetails.blade_transfer.ready_time && (
                        <div>Pickup Ready Time: {serviceDetails.blade_transfer.ready_time}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information with booking link */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Customer Information</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.customer && (
                  <>
                    <div className="text-navy-800"><strong className="text-navy-900">Name:</strong> {booking.customer.name}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Email:</strong> {booking.customer.email}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Phone:</strong> {booking.customer.phone}</div>
                    <div className="text-navy-800">
                      <strong className="text-navy-900">VIP Status:</strong> 
                      <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.customer.is_vip ? 'bg-gold-100 text-gold-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.customer.is_vip ? 'VIP Customer' : 'Standard Customer'}
                      </span>
                    </div>
                    
                    <div className="pt-2 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/staff/customers/${booking.customer.id}`)}
                        className="w-full"
                      >
                        View Customer Profile
                      </Button>
                      
                      {booking.customer.total_bookings > 1 && (
                        <button
                          onClick={() => router.push(`/staff/bookings?customer=${booking.customer.id}`)}
                          className="text-sm text-navy-600 hover:text-navy-800 underline w-full text-center"
                        >
                          View all {booking.customer.total_bookings} bookings by this customer
                        </button>
                      )}
                    </div>
                  </>
                )}
                {booking.guest_checkout && (
                  <>
                    <div className="text-navy-800"><strong className="text-navy-900">Name:</strong> {booking.guest_checkout.first_name} {booking.guest_checkout.last_name}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Email:</strong> {booking.guest_checkout.email}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Phone:</strong> {booking.guest_checkout.phone}</div>
                    <div className="text-navy-600 text-sm">Guest Customer (no account)</div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pricing Breakdown - FIXED */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Pricing Breakdown</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  
                  {/* Standard Delivery - Show items breakdown */}
                  {booking.booking?.service_type === 'standard_delivery' && serviceDetails.standard_delivery && (
                    <>
                      {/* Regular delivery items */}
                      {serviceDetails.standard_delivery.item_count > 0 && (
                        <div className="flex justify-between">
                          <span className="text-navy-900">
                            Standard Delivery ({serviceDetails.standard_delivery.item_count} items):
                          </span>
                          <span className="text-navy-900 font-medium">
                            ${Math.max((serviceDetails.standard_delivery.item_count * 95), 285)}
                          </span>
                        </div>
                      )}
                      
                      {/* Specialty items */}
                      {serviceDetails.specialty_items && serviceDetails.specialty_items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-navy-900">{item.name} (Specialty):</span>
                          <span className="text-navy-900 font-medium">${item.price_dollars}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Mini Move - Show base price */}
                  {booking.booking?.service_type === 'mini_move' && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Base Price:</span>
                      <span className="text-navy-900 font-medium">${booking.booking?.base_price_dollars || 0}</span>
                    </div>
                  )}

                  {/* Specialty Item Only */}
                  {booking.booking?.service_type === 'specialty_item' && serviceDetails.specialty_items && (
                    <>
                      {serviceDetails.specialty_items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-navy-900">{item.name}:</span>
                          <span className="text-navy-900 font-medium">${item.price_dollars}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Airport Transfer */}
                  {booking.booking?.service_type === 'blade_transfer' && serviceDetails.blade_transfer && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">
                        Airport Transfer ({serviceDetails.blade_transfer.bag_count} bags × $75):
                      </span>
                      <span className="text-navy-900 font-medium">${booking.booking?.base_price_dollars || 0}</span>
                    </div>
                  )}

                  {/* Same-Day Surcharge */}
                  {booking.booking?.same_day_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Same-Day Delivery:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.same_day_surcharge_dollars}</span>
                    </div>
                  )}

                  {/* Peak Date Surcharges */}
                  {booking.booking?.surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Peak Date Surcharge:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.surcharge_dollars}</span>
                    </div>
                  )}

                  {/* COI Fee */}
                  {booking.booking?.coi_fee_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">COI Fee:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.coi_fee_dollars}</span>
                    </div>
                  )}

                  {/* Organizing Total */}
                  {booking.booking?.organizing_total_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Organizing Services:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.organizing_total_dollars}</span>
                    </div>
                  )}

                  {/* Geographic Surcharge */}
                  {booking.booking?.geographic_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Geographic Surcharge:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.geographic_surcharge_dollars}</span>
                    </div>
                  )}

                  {/* Time Window Surcharge */}
                  {booking.booking?.time_window_surcharge_dollars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-900">Time Window Surcharge:</span>
                      <span className="text-navy-900 font-medium">+${booking.booking.time_window_surcharge_dollars}</span>
                    </div>
                  )}

                  {/* Discount */}
                  {booking.booking?.discount_amount_dollars > 0 && (
                    <>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-navy-900">Subtotal:</span>
                        <span className="text-navy-900 font-medium">${booking.booking.pre_discount_total_dollars}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">
                          Discount ({booking.booking.discount_description || booking.booking.discount_code_name}):
                        </span>
                        <span className="text-green-700 font-medium">-${booking.booking.discount_amount_dollars}</span>
                      </div>
                    </>
                  )}

                  {/* Total */}
                  <div className={`flex justify-between text-lg font-bold pt-2 mt-2 ${booking.booking?.discount_amount_dollars > 0 ? '' : 'border-t'}`}>
                    <span className="text-navy-900">Total:</span>
                    <span className="text-navy-900">${booking.booking?.total_price_dollars}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Addresses - Always visible, side-by-side */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Addresses</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">
                      {booking.booking?.service_type === 'blade_transfer'
                        ? serviceDetails.blade_transfer?.transfer_direction === 'from_airport' ? 'Pickup Address (Airport)' : 'Pickup Address (Customer)'
                        : 'Pickup Address'}
                    </h4>
                    <div className="text-navy-800 text-sm">
                      <div>{booking.booking?.pickup_address?.address_line_1}</div>
                      {booking.booking?.pickup_address?.address_line_2 && (
                        <div>{booking.booking.pickup_address.address_line_2}</div>
                      )}
                      <div>
                        {booking.booking?.pickup_address?.city}, {booking.booking?.pickup_address?.state} {booking.booking?.pickup_address?.zip_code}
                      </div>
                      {booking.booking?.service_type === 'blade_transfer' && serviceDetails.blade_transfer?.transfer_direction === 'from_airport' && serviceDetails.blade_transfer?.terminal && (
                        <div className="text-navy-600 font-medium mt-1">Terminal {serviceDetails.blade_transfer.terminal}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-navy-900 mb-2">
                      {booking.booking?.service_type === 'blade_transfer'
                        ? serviceDetails.blade_transfer?.transfer_direction === 'from_airport' ? 'Delivery Address (Customer)' : 'Delivery Address (Airport)'
                        : 'Delivery Address'}
                    </h4>
                    <div className="text-navy-800 text-sm">
                      <div>{booking.booking?.delivery_address?.address_line_1}</div>
                      {booking.booking?.delivery_address?.address_line_2 && (
                        <div>{booking.booking.delivery_address.address_line_2}</div>
                      )}
                      <div>
                        {booking.booking?.delivery_address?.city}, {booking.booking?.delivery_address?.state} {booking.booking?.delivery_address?.zip_code}
                      </div>
                      {booking.booking?.service_type === 'blade_transfer' && serviceDetails.blade_transfer?.transfer_direction !== 'from_airport' && serviceDetails.blade_transfer?.terminal && (
                        <div className="text-navy-600 font-medium mt-1">Terminal {serviceDetails.blade_transfer.terminal}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Payment Information */}
            {booking.payment && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-navy-900">Payment Information</h3>
                    {(booking.payment.status === 'succeeded' || booking.payment.status === 'partially_refunded') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowRefundModal(true)}
                      >
                        Issue Refund
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-navy-800">
                    <div>
                      <strong className="text-navy-900">Status:</strong>{' '}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getPaymentStatusColor(booking.payment.status)}`}>
                        {booking.payment.status}
                      </span>
                    </div>
                    <div><strong className="text-navy-900">Amount:</strong> ${booking.payment.amount_dollars}</div>
                    <div><strong className="text-navy-900">Payment ID:</strong> <span className="text-xs font-mono">{booking.payment.id}</span></div>
                  </div>

                  {booking.payment.processed_at && (
                    <div className="text-sm text-navy-600">
                      Processed: {new Date(booking.payment.processed_at).toLocaleString()}
                    </div>
                  )}

                  {refundsData && refundsData.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium text-navy-900 mb-3">Refund History</h4>
                      <div className="space-y-2">
                        {refundsData.map((refund: Refund) => (
                          <div key={refund.id} className="bg-orange-50 border border-orange-200 rounded-md p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium text-navy-900">${refund.amount_dollars}</span>
                                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  refund.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {refund.status}
                                </span>
                              </div>
                              <span className="text-xs text-navy-600">
                                {new Date(refund.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-navy-700 mb-1">
                              <strong>Reason:</strong> {refund.reason}
                            </p>
                            <p className="text-xs text-navy-600">
                              By: {refund.requested_by_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Log */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Activity Timeline</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {booking.booking?.created_at && (
                    <div className="flex items-start">
                      <div className="w-32 text-navy-600 flex-shrink-0">
                        {new Date(booking.booking.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-navy-800">
                        Booking created by {booking.customer?.name || 'Guest'}
                      </div>
                    </div>
                  )}
                  
                  {booking.payment?.processed_at && (
                    <div className="flex items-start">
                      <div className="w-32 text-navy-600 flex-shrink-0">
                        {new Date(booking.payment.processed_at).toLocaleDateString()}
                      </div>
                      <div className="text-navy-800">
                        Payment received (${booking.payment.amount_dollars})
                      </div>
                    </div>
                  )}
                  
                  {refundsData?.map((refund: Refund) => (
                    <div key={refund.id} className="flex items-start">
                      <div className="w-32 text-navy-600 flex-shrink-0">
                        {new Date(refund.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-navy-800">
                        Refund processed by {refund.requested_by_name} (${refund.amount_dollars})
                      </div>
                    </div>
                  ))}
                  
                  {booking.booking?.updated_at && booking.booking.updated_at !== booking.booking.created_at && (
                    <div className="flex items-start">
                      <div className="w-32 text-navy-600 flex-shrink-0">
                        {new Date(booking.booking.updated_at).toLocaleDateString()}
                      </div>
                      <div className="text-navy-800">
                        Booking updated
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Refund Modal */}
        {booking.payment && (
          <RefundModal
            isOpen={showRefundModal}
            onClose={() => setShowRefundModal(false)}
            payment={booking.payment}
            bookingNumber={booking.booking?.booking_number || ''}
          />
        )}
      </div>
    </StaffLayout>
  );
}