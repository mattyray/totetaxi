'use client';

// frontend/src/app/staff/bookings/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  };
  blade_transfer?: {
    airport: string;
    flight_date: string;
    flight_time: string;
    bag_count: number;
    ready_time: string;
    per_bag_price: number;
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy-900">
              Booking #{booking?.booking?.booking_number}
            </h1>
            <p className="text-navy-600 mt-1">
              {booking?.booking?.service_type_display} • {booking?.customer?.name || 'Guest Customer'}
            </p>
          </div>
          <div className="flex space-x-3">
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
              ← Back to Bookings
            </Button>
          </div>
        </div>

        {booking && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Booking Information</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <Select
                      label="Status"
                      options={statusOptions}
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    />
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
                    <div className="text-navy-800"><strong className="text-navy-900">Booking #:</strong> {booking.booking?.booking_number}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Service:</strong> {booking.booking?.service_type_display}</div>
                    <div className="text-navy-800">
                      <strong className="text-navy-900">Status:</strong> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.booking?.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.booking?.status === 'paid'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.booking?.status === 'confirmed'
                          ? 'bg-purple-100 text-purple-800'
                          : booking.booking?.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.booking?.status}
                      </span>
                    </div>
                    <div className="text-navy-800"><strong className="text-navy-900">Pickup Date:</strong> {new Date(booking.booking?.pickup_date).toLocaleDateString()}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Pickup Time:</strong> {booking.booking?.pickup_time_display}</div>
                    <div className="text-navy-800"><strong className="text-navy-900">Total:</strong> ${booking.booking?.total_price_dollars}</div>
                    {booking.booking?.special_instructions && (
                      <div className="text-navy-800"><strong className="text-navy-900">Instructions:</strong> {booking.booking.special_instructions}</div>
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
              </CardContent>
            </Card>

            {/* Service Details Card */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Service Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <strong className="text-navy-900">Service Type:</strong> 
                  <span className="ml-2 text-navy-800">{booking.booking?.service_type_display}</span>
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
                          <span className="font-medium">${item.price_dollars}</span>
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
                    {serviceDetails.standard_delivery.is_same_day && (
                      <div className="text-orange-600 font-medium">Same-Day Delivery</div>
                    )}
                  </div>
                )}

                {/* BLADE Transfer */}
                {serviceDetails.blade_transfer && (
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="font-semibold text-navy-900">BLADE Airport Transfer</div>
                    <div className="space-y-1 text-navy-800">
                      <div>Airport: <strong>{serviceDetails.blade_transfer.airport}</strong></div>
                      <div>Flight: {new Date(serviceDetails.blade_transfer.flight_date).toLocaleDateString()} at {serviceDetails.blade_transfer.flight_time}</div>
                      <div>Bags: {serviceDetails.blade_transfer.bag_count} @ ${serviceDetails.blade_transfer.per_bag_price}/bag</div>
                      {serviceDetails.blade_transfer.ready_time && (
                        <div>Ready: {serviceDetails.blade_transfer.ready_time}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/staff/customers/${booking.customer.id}`)}
                    >
                      View Customer Details
                    </Button>
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

            {/* Pricing Breakdown */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Pricing Breakdown</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {booking.booking?.pricing_breakdown && (
                    <div className="space-y-2 text-sm">
                      {Object.entries(booking.booking.pricing_breakdown).map(([key, value]: [string, any]) => {
                        // Skip nested objects like blade_details
                        if (typeof value === 'object' && value !== null) return null;
                        
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-navy-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-navy-900 font-medium">${value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>${booking.booking?.total_price_dollars}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup Address */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Pickup Address</h3>
              </CardHeader>
              <CardContent>
                <div className="text-navy-800">
                  <div>{booking.booking?.pickup_address?.address_line_1}</div>
                  {booking.booking?.pickup_address?.address_line_2 && (
                    <div>{booking.booking.pickup_address.address_line_2}</div>
                  )}
                  <div>
                    {booking.booking?.pickup_address?.city}, {booking.booking?.pickup_address?.state} {booking.booking?.pickup_address?.zip_code}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-navy-900">Delivery Address</h3>
              </CardHeader>
              <CardContent>
                <div className="text-navy-800">
                  <div>{booking.booking?.delivery_address?.address_line_1}</div>
                  {booking.booking?.delivery_address?.address_line_2 && (
                    <div>{booking.booking.delivery_address.address_line_2}</div>
                  )}
                  <div>
                    {booking.booking?.delivery_address?.city}, {booking.booking?.delivery_address?.state} {booking.booking?.delivery_address?.zip_code}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            {booking.payment && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <h3 className="text-lg font-medium text-navy-900">Payment Information</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-navy-800">
                    <div><strong className="text-navy-900">Status:</strong> {booking.payment.status}</div>
                    <div><strong className="text-navy-900">Amount:</strong> ${booking.payment.amount_dollars}</div>
                    <div><strong className="text-navy-900">Payment ID:</strong> {booking.payment.id}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}