// frontend/src/components/staff/staff-create-booking-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { StaffCreateBookingRequest, StaffCreateBookingResponse } from '@/types';
import { GoogleAddressInput } from '@/components/booking/google-address-input';
import { parseGooglePlace } from '@/lib/google-places-utils';

interface StaffCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (booking: StaffCreateBookingResponse['booking']) => void;
}

interface ServiceCatalog {
  mini_move_packages: Array<{
    id: string;
    name: string;
    package_type: string;
    base_price_dollars: number;
    description: string;
  }>;
  specialty_items: Array<{
    id: string;
    name: string;
    price_dollars: number;
    item_type: string;
  }>;
}

const SERVICE_TYPE_OPTIONS = [
  { value: 'mini_move', label: 'Mini Move' },
  { value: 'standard_delivery', label: 'Standard Delivery' },
  { value: 'specialty_item', label: 'Specialty Item' },
  { value: 'blade_transfer', label: 'Airport Transfer' },
];

const PICKUP_TIME_OPTIONS = [
  { value: 'morning', label: '8 AM - 11 AM' },
  { value: 'morning_specific', label: 'Specific 1-hour window' },
  { value: 'no_time_preference', label: 'No time preference' },
];

const STATE_OPTIONS = [
  { value: 'NY', label: 'New York' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'NJ', label: 'New Jersey' },
];

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}

const emptyAddress = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: 'NY',
  zip_code: '',
};

export function StaffCreateBookingModal({ isOpen, onClose, onSuccess }: StaffCreateBookingModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdBooking, setCreatedBooking] = useState<StaffCreateBookingResponse['booking'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [miniMovePackageId, setMiniMovePackageId] = useState('');
  const [includePacking, setIncludePacking] = useState(false);
  const [includeUnpacking, setIncludeUnpacking] = useState(false);
  const [standardDeliveryItemCount, setStandardDeliveryItemCount] = useState(3);
  const [itemDescription, setItemDescription] = useState('');
  const [isSameDayDelivery, setIsSameDayDelivery] = useState(false);
  const [selectedSpecialtyItems, setSelectedSpecialtyItems] = useState<Array<{ item_id: string; quantity: number }>>([]);
  const [bladeAirport, setBladeAirport] = useState<'JFK' | 'EWR'>('JFK');
  const [bladeFlightDate, setBladeFlightDate] = useState('');
  const [bladeFlightTime, setBladeFlightTime] = useState('');
  const [bladeBagCount, setBladeBagCount] = useState(2);
  const [transferDirection, setTransferDirection] = useState<'to_airport' | 'from_airport'>('to_airport');
  const [bladeTerminal, setBladeTerminal] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('morning');
  const [specificPickupHour, setSpecificPickupHour] = useState<number>(8);
  const [pickupAddress, setPickupAddress] = useState({ ...emptyAddress });
  const [deliveryAddress, setDeliveryAddress] = useState({ ...emptyAddress });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [coiRequired, setCoiRequired] = useState(false);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotalDollars, setCustomTotalDollars] = useState('');

  // Fetch service catalog
  const { data: catalog } = useQuery<ServiceCatalog>({
    queryKey: ['service-catalog'],
    queryFn: async () => {
      const res = await apiClient.get('/api/public/services/');
      return res.data;
    },
    enabled: isOpen,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: StaffCreateBookingRequest) => {
      const res = await apiClient.post('/api/staff/bookings/create/', data);
      return res.data as StaffCreateBookingResponse;
    },
    onSuccess: (data) => {
      setCreatedBooking(data.booking);
      setStep('success');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : null)
        || 'Failed to create booking';
      setError(msg);
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setCreatedBooking(null);
      setError(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setServiceType('');
      setMiniMovePackageId('');
      setIncludePacking(false);
      setIncludeUnpacking(false);
      setStandardDeliveryItemCount(3);
      setItemDescription('');
      setIsSameDayDelivery(false);
      setSelectedSpecialtyItems([]);
      setBladeAirport('JFK');
      setBladeFlightDate('');
      setBladeFlightTime('');
      setBladeBagCount(2);
      setTransferDirection('to_airport');
      setBladeTerminal('');
      setPickupDate('');
      setPickupTime('morning');
      setSpecificPickupHour(8);
      setPickupAddress({ ...emptyAddress });
      setDeliveryAddress({ ...emptyAddress });
      setSpecialInstructions('');
      setCoiRequired(false);
      setUseCustomTotal(false);
      setCustomTotalDollars('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    setError(null);

    const data: StaffCreateBookingRequest = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      service_type: serviceType as StaffCreateBookingRequest['service_type'],
      pickup_date: pickupDate,
      pickup_time: pickupTime as StaffCreateBookingRequest['pickup_time'],
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      special_instructions: specialInstructions,
      coi_required: coiRequired,
    };

    // Service-specific fields
    if (serviceType === 'mini_move') {
      data.mini_move_package_id = miniMovePackageId;
      data.include_packing = includePacking;
      data.include_unpacking = includeUnpacking;
    } else if (serviceType === 'standard_delivery') {
      data.standard_delivery_item_count = standardDeliveryItemCount;
      data.item_description = itemDescription;
      data.is_same_day_delivery = isSameDayDelivery;
      if (selectedSpecialtyItems.length > 0) {
        data.specialty_items = selectedSpecialtyItems;
      }
    } else if (serviceType === 'specialty_item') {
      data.specialty_items = selectedSpecialtyItems;
      data.is_same_day_delivery = isSameDayDelivery;
    } else if (serviceType === 'blade_transfer') {
      data.blade_airport = bladeAirport;
      data.blade_flight_date = bladeFlightDate;
      data.blade_flight_time = bladeFlightTime;
      data.blade_bag_count = bladeBagCount;
      data.transfer_direction = transferDirection;
      data.blade_terminal = bladeTerminal;
    }

    if (pickupTime === 'morning_specific') {
      data.specific_pickup_hour = specificPickupHour;
    }

    if (useCustomTotal && customTotalDollars) {
      data.custom_total_override_cents = Math.round(parseFloat(customTotalDollars) * 100);
    }

    createBookingMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        {step === 'success' && createdBooking ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">Booking Created</h2>
            <p className="text-navy-600 mb-4">
              Booking <span className="font-semibold">{createdBooking.booking_number}</span> has been created
              and a payment link has been sent to <span className="font-semibold">{createdBooking.customer_email}</span>.
            </p>
            <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-navy-500">Customer:</div>
                <div className="font-medium text-navy-900">{createdBooking.customer_name}</div>
                <div className="text-navy-500">Service:</div>
                <div className="font-medium text-navy-900">{createdBooking.service_type}</div>
                <div className="text-navy-500">Total:</div>
                <div className="font-medium text-navy-900">${createdBooking.total_price_dollars}</div>
                <div className="text-navy-500">Status:</div>
                <div className="font-medium text-navy-900 capitalize">{createdBooking.status}</div>
              </div>
            </div>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={() => { onClose(); onSuccess?.(createdBooking); }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Form */
          <>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-serif font-bold text-navy-900">New Booking</h2>
                <button onClick={onClose} className="text-navy-400 hover:text-navy-600 text-2xl">&times;</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Customer Info */}
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Customer Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input placeholder="Phone" value={formatPhoneNumber(phone)} onChange={(e) => setPhone(unformatPhone(e.target.value))} />
                </div>
              </section>

              {/* Service Selection */}
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Service</h3>
                <Select
                  options={SERVICE_TYPE_OPTIONS}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="Select a service"
                />

                {/* Mini Move fields */}
                {serviceType === 'mini_move' && catalog?.mini_move_packages && (
                  <div className="mt-4 space-y-3">
                    <Select
                      options={catalog.mini_move_packages.map(p => ({
                        value: p.id,
                        label: `${p.name} - $${p.base_price_dollars}`,
                      }))}
                      value={miniMovePackageId}
                      onChange={(e) => setMiniMovePackageId(e.target.value)}
                      placeholder="Select package"
                    />
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={includePacking} onChange={(e) => setIncludePacking(e.target.checked)} className="rounded" />
                        <span className="text-sm text-gray-900">Include packing</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={includeUnpacking} onChange={(e) => setIncludeUnpacking(e.target.checked)} className="rounded" />
                        <span className="text-sm text-gray-900">Include unpacking</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Standard Delivery fields */}
                {serviceType === 'standard_delivery' && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1">Item count</label>
                        <Input
                          type="number"
                          min={0}
                          value={standardDeliveryItemCount}
                          onChange={(e) => setStandardDeliveryItemCount(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1">Item description</label>
                        <Input value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="e.g., Boxes, furniture" />
                      </div>
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={isSameDayDelivery} onChange={(e) => setIsSameDayDelivery(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-900">Same-day delivery (+$360)</span>
                    </label>
                  </div>
                )}

                {/* Specialty Item fields */}
                {serviceType === 'specialty_item' && catalog?.specialty_items && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-navy-600">Select specialty items:</p>
                    {catalog.specialty_items.map(item => {
                      const existing = selectedSpecialtyItems.find(s => s.item_id === item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-cream-50 rounded-lg p-3">
                          <div>
                            <span className="font-medium text-sm">{item.name}</span>
                            <span className="text-navy-500 text-sm ml-2">${item.price_dollars}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min={0}
                              value={existing?.quantity || 0}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 0;
                                setSelectedSpecialtyItems(prev => {
                                  const filtered = prev.filter(s => s.item_id !== item.id);
                                  if (qty > 0) filtered.push({ item_id: item.id, quantity: qty });
                                  return filtered;
                                });
                              }}
                              className="w-20"
                            />
                          </div>
                        </div>
                      );
                    })}
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={isSameDayDelivery} onChange={(e) => setIsSameDayDelivery(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-900">Same-day delivery (+$360)</span>
                    </label>
                  </div>
                )}

                {/* Airport Transfer fields */}
                {serviceType === 'blade_transfer' && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        options={[
                          { value: 'to_airport', label: 'To Airport (Luggage Delivery)' },
                          { value: 'from_airport', label: 'From Airport (Arrival Pickup)' },
                        ]}
                        value={transferDirection}
                        onChange={(e) => setTransferDirection(e.target.value as 'to_airport' | 'from_airport')}
                      />
                      <Select
                        options={[
                          { value: 'JFK', label: 'JFK International' },
                          { value: 'EWR', label: 'Newark Liberty' },
                        ]}
                        value={bladeAirport}
                        onChange={(e) => setBladeAirport(e.target.value as 'JFK' | 'EWR')}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1">Flight date</label>
                        <Input type="date" value={bladeFlightDate} onChange={(e) => setBladeFlightDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1">Flight time</label>
                        <Input type="time" value={bladeFlightTime} onChange={(e) => setBladeFlightTime(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1">Bags (min 2)</label>
                        <Input type="number" min={2} value={bladeBagCount} onChange={(e) => setBladeBagCount(parseInt(e.target.value) || 2)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1">Terminal (optional)</label>
                      <Input value={bladeTerminal} onChange={(e) => setBladeTerminal(e.target.value)} placeholder="e.g., 1, 4, B" />
                    </div>
                  </div>
                )}
              </section>

              {/* Scheduling */}
              {serviceType && serviceType !== 'blade_transfer' && (
                <section>
                  <h3 className="text-lg font-semibold text-navy-900 mb-3">Scheduling</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1">Pickup date</label>
                      <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                    </div>
                    <Select
                      options={PICKUP_TIME_OPTIONS}
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </div>
                  {pickupTime === 'morning_specific' && (
                    <div className="mt-3">
                      <Select
                        options={[
                          { value: '8', label: '8:00 AM - 9:00 AM' },
                          { value: '9', label: '9:00 AM - 10:00 AM' },
                          { value: '10', label: '10:00 AM - 11:00 AM' },
                        ]}
                        value={String(specificPickupHour)}
                        onChange={(e) => setSpecificPickupHour(parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* For blade_transfer, use flight date as pickup date */}
              {serviceType === 'blade_transfer' && (
                <input type="hidden" value={bladeFlightDate} />
              )}

              {/* Addresses */}
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Addresses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pickup Address */}
                  <div className="space-y-2">
                    <GoogleAddressInput
                      label="Pickup Address"
                      value={pickupAddress.address_line_1}
                      onChange={(val) => setPickupAddress(prev => ({ ...prev, address_line_1: val }))}
                      onPlaceSelected={(place) => {
                        const parsed = parseGooglePlace(place);
                        if (parsed) {
                          setPickupAddress(prev => ({
                            ...prev,
                            address_line_1: parsed.address_line_1 || prev.address_line_1,
                            city: parsed.city || prev.city,
                            state: parsed.state || prev.state,
                            zip_code: parsed.zip_code || prev.zip_code,
                          }));
                        }
                      }}
                      placeholder="Start typing an address..."
                    />
                    <Input placeholder="Address line 2 (optional)" value={pickupAddress.address_line_2} onChange={(e) => setPickupAddress(prev => ({ ...prev, address_line_2: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="City" value={pickupAddress.city} onChange={(e) => setPickupAddress(prev => ({ ...prev, city: e.target.value }))} />
                      <Select options={STATE_OPTIONS} value={pickupAddress.state} onChange={(e) => setPickupAddress(prev => ({ ...prev, state: e.target.value }))} />
                      <Input placeholder="ZIP" value={pickupAddress.zip_code} onChange={(e) => setPickupAddress(prev => ({ ...prev, zip_code: e.target.value }))} />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-2">
                    <GoogleAddressInput
                      label="Delivery Address"
                      value={deliveryAddress.address_line_1}
                      onChange={(val) => setDeliveryAddress(prev => ({ ...prev, address_line_1: val }))}
                      onPlaceSelected={(place) => {
                        const parsed = parseGooglePlace(place);
                        if (parsed) {
                          setDeliveryAddress(prev => ({
                            ...prev,
                            address_line_1: parsed.address_line_1 || prev.address_line_1,
                            city: parsed.city || prev.city,
                            state: parsed.state || prev.state,
                            zip_code: parsed.zip_code || prev.zip_code,
                          }));
                        }
                      }}
                      placeholder="Start typing an address..."
                    />
                    <Input placeholder="Address line 2 (optional)" value={deliveryAddress.address_line_2} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, address_line_2: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="City" value={deliveryAddress.city} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))} />
                      <Select options={STATE_OPTIONS} value={deliveryAddress.state} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))} />
                      <Input placeholder="ZIP" value={deliveryAddress.zip_code} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zip_code: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Options */}
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Options</h3>
                <div className="space-y-3">
                  <textarea
                    className="w-full rounded-lg border border-navy-200 p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    rows={3}
                    placeholder="Special instructions (optional)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={coiRequired} onChange={(e) => setCoiRequired(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-900">Certificate of Insurance required</span>
                  </label>
                </div>
              </section>

              {/* Custom Pricing */}
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Pricing</h3>
                <div className="bg-cream-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-navy-600">
                    Price will be auto-calculated based on service details. Toggle below to override with a custom quote.
                  </p>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useCustomTotal}
                      onChange={(e) => setUseCustomTotal(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">Use custom total</span>
                  </label>
                  {useCustomTotal && (
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={customTotalDollars}
                        onChange={(e) => setCustomTotalDollars(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-lg flex justify-between">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending || !serviceType || !firstName || !email || !pickupDate}
              >
                {createBookingMutation.isPending ? 'Creating...' : 'Create Booking & Send Payment Link'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
