'use client';

import { useState } from 'react';
import { useBookingWizard, type BookingAddress } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATES = [
  { value: 'NY', label: 'New York' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'NJ', label: 'New Jersey' },
];

const POPULAR_ADDRESSES = {
  pickup: [
    { name: 'Upper East Side', address: 'Upper East Side, New York, NY' },
    { name: 'Upper West Side', address: 'Upper West Side, New York, NY' },
    { name: 'Midtown East', address: 'Midtown East, New York, NY' },
    { name: 'SoHo', address: 'SoHo, New York, NY' },
    { name: 'Tribeca', address: 'Tribeca, New York, NY' },
  ],
  delivery: [
    { name: 'East Hampton', address: 'East Hampton, NY' },
    { name: 'Southampton', address: 'Southampton, NY' },
    { name: 'Bridgehampton', address: 'Bridgehampton, NY' },
    { name: 'Westhampton Beach', address: 'Westhampton Beach, NY' },
    { name: 'Sag Harbor', address: 'Sag Harbor, NY' },
  ]
};

interface AddressFormProps {
  title: string;
  address: BookingAddress | undefined;
  onAddressChange: (address: BookingAddress) => void;
  popularAddresses: Array<{ name: string; address: string }>;
  errors: Record<string, string>;
}

function AddressForm({ title, address, onAddressChange, popularAddresses, errors }: AddressFormProps) {
  const [showQuickSelect, setShowQuickSelect] = useState(!address?.address_line_1);

  const handleQuickSelect = (selectedAddress: string) => {
    // Parse the quick-select address
    const parts = selectedAddress.split(', ');
    onAddressChange({
      address_line_1: parts[0],
      city: parts[1] || '',
      state: (parts[2] || 'NY') as 'NY' | 'CT' | 'NJ',
      zip_code: '',
      address_line_2: ''
    });
    setShowQuickSelect(false);
  };

  const handleFieldChange = (field: keyof BookingAddress, value: string) => {
    onAddressChange({
      ...address,
      [field]: value
    } as BookingAddress);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-navy-900">{title}</h3>
          {address?.address_line_1 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowQuickSelect(!showQuickSelect)}
            >
              {showQuickSelect ? 'Manual Entry' : 'Quick Select'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {showQuickSelect ? (
          <div className="space-y-2">
            <p className="text-sm text-navy-600 mb-3">Popular {title.toLowerCase()} locations:</p>
            {popularAddresses.map((addr, index) => (
              <button
                key={index}
                onClick={() => handleQuickSelect(addr.address)}
                className="w-full text-left p-3 rounded-md border border-gray-200 hover:border-navy-300 hover:bg-navy-50 transition-all"
              >
                <span className="font-medium text-navy-900">{addr.name}</span>
                <span className="block text-sm text-navy-600">{addr.address}</span>
              </button>
            ))}
            <button
              onClick={() => setShowQuickSelect(false)}
              className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-md text-navy-600 hover:border-navy-400 transition-all"
            >
              + Enter Custom Address
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Street Address"
              value={address?.address_line_1 || ''}
              onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
              error={errors.address_line_1}
              placeholder="123 Main Street"
              required
            />
            
            <Input
              label="Apartment, Suite, etc. (Optional)"
              value={address?.address_line_2 || ''}
              onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
              placeholder="Apt 4B, Suite 200"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={address?.city || ''}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                error={errors.city}
                placeholder="New York"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  State
                </label>
                <select
                  value={address?.state || 'NY'}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
                >
                  {STATES.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <Input
              label="ZIP Code"
              value={address?.zip_code || ''}
              onChange={(e) => handleFieldChange('zip_code', e.target.value)}
              error={errors.zip_code}
              placeholder="10001"
              required
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AddressStep() {
  const { bookingData, updateBookingData, nextStep, errors, setError, clearError } = useBookingWizard();

  const handlePickupChange = (address: BookingAddress) => {
    updateBookingData({ pickup_address: address });
    clearError('pickup_address');
  };

  const handleDeliveryChange = (address: BookingAddress) => {
    updateBookingData({ delivery_address: address });
    clearError('delivery_address');
  };

  const validateAndContinue = () => {
    let hasErrors = false;

    // Validate pickup address
    if (!bookingData.pickup_address?.address_line_1) {
      setError('pickup_address', 'Pickup address is required');
      hasErrors = true;
    }
    if (!bookingData.pickup_address?.city) {
      setError('pickup_city', 'City is required');
      hasErrors = true;
    }
    if (!bookingData.pickup_address?.zip_code) {
      setError('pickup_zip', 'ZIP code is required');
      hasErrors = true;
    }

    // Validate delivery address
    if (!bookingData.delivery_address?.address_line_1) {
      setError('delivery_address', 'Delivery address is required');
      hasErrors = true;
    }
    if (!bookingData.delivery_address?.city) {
      setError('delivery_city', 'City is required');
      hasErrors = true;
    }
    if (!bookingData.delivery_address?.zip_code) {
      setError('delivery_zip', 'ZIP code is required');
      hasErrors = true;
    }

    if (!hasErrors) {
      nextStep();
    }
  };

  const canContinue = 
    bookingData.pickup_address?.address_line_1 &&
    bookingData.pickup_address?.city &&
    bookingData.pickup_address?.zip_code &&
    bookingData.delivery_address?.address_line_1 &&
    bookingData.delivery_address?.city &&
    bookingData.delivery_address?.zip_code;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center py-4">
        <p className="text-navy-700">
          Where should we pick up and deliver your items?
        </p>
        <p className="text-sm text-navy-600 mt-1">
          We service Manhattan, Brooklyn, the Hamptons, and surrounding areas.
        </p>
      </div>

      {/* Pickup Address */}
      <AddressForm
        title="Pickup Address"
        address={bookingData.pickup_address}
        onAddressChange={handlePickupChange}
        popularAddresses={POPULAR_ADDRESSES.pickup}
        errors={{
          address_line_1: errors.pickup_address || '',
          city: errors.pickup_city || '',
          zip_code: errors.pickup_zip || ''
        }}
      />

      {/* Delivery Address */}
      <AddressForm
        title="Delivery Address"
        address={bookingData.delivery_address}
        onAddressChange={handleDeliveryChange}
        popularAddresses={POPULAR_ADDRESSES.delivery}
        errors={{
          address_line_1: errors.delivery_address || '',
          city: errors.delivery_city || '',
          zip_code: errors.delivery_zip || ''
        }}
      />

      {/* Special Instructions */}
      <Card variant="default">
        <CardContent>
          <label className="block text-sm font-medium text-navy-900 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={bookingData.special_instructions || ''}
            onChange={(e) => updateBookingData({ special_instructions: e.target.value })}
            placeholder="Any special delivery instructions, building access codes, or notes for our team..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500"
          />
          <p className="text-sm text-navy-600 mt-1">
            Include building access codes, doorman instructions, or any special handling requests.
          </p>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          variant="primary" 
          onClick={validateAndContinue}
          disabled={!canContinue}
        >
          Continue to Your Info →
        </Button>
      </div>
    </div>
  );
}