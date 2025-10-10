'use client';

import { useEffect, useState } from 'react';
import { useBookingWizard, type BookingAddress } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { GoogleAddressInput } from './google-address-input';
import { parseGooglePlace } from '@/lib/google-places-utils';

const STATES = [
  { value: 'NY', label: 'New York' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'NJ', label: 'New Jersey' },
];

const AIRPORT_ADDRESSES = {
  JFK: {
    address_line_1: 'JFK International Airport',
    address_line_2: '',
    city: 'Jamaica',
    state: 'NY' as const,
    zip_code: '11430'
  },
  EWR: {
    address_line_1: 'Newark Liberty International Airport',
    address_line_2: '',
    city: 'Newark',
    state: 'NJ' as const,
    zip_code: '07114'
  }
};

interface AddressFormProps {
  title: string;
  address: BookingAddress | undefined;
  onAddressChange: (address: BookingAddress) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
  onZipChange?: (zip: string) => void;
  validationMessage?: {
    type: 'error' | 'warning' | 'success';
    message: string;
  } | null;
  isValidating?: boolean;
}

function AddressForm({ 
  title, 
  address, 
  onAddressChange, 
  errors, 
  readOnly = false,
  onZipChange,
  validationMessage,
  isValidating = false
}: AddressFormProps) {
  const handleFieldChange = (field: keyof BookingAddress, value: string) => {
    if (readOnly) return;
    
    onAddressChange({
      ...address,
      [field]: value
    } as BookingAddress);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleFieldChange('zip_code', value);
    
    if (onZipChange && value.length === 5) {
      onZipChange(value);
    }
  };

  return (
    <Card variant="elevated" className="p-8">
      <CardHeader className="p-0 pb-6">
        <h3 className="text-lg font-medium text-navy-900">{title}</h3>
        {readOnly && (
          <p className="text-sm text-navy-600 mt-1">
            Airport address is automatically set based on your BLADE flight selection.
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-6">
          <GoogleAddressInput
            label="Street Address"
            value={address?.address_line_1 || ''}
            onChange={(value) => handleFieldChange('address_line_1', value)}
            onPlaceSelected={(place) => {
              const parsed = parseGooglePlace(place);
              
              if (parsed) {
                onAddressChange({
                  ...address,
                  ...parsed
                } as BookingAddress);
                
                if (onZipChange && parsed.zip_code) {
                  requestAnimationFrame(() => {
                    onZipChange(parsed.zip_code!);
                  });
                }
              }
            }}
            error={errors.address_line_1}
            placeholder="Start typing your address..."
            required
            disabled={readOnly}
          />
                    
          <Input
            label="Apartment, Suite, etc. (Optional)"
            value={address?.address_line_2 || ''}
            onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
            placeholder="Apt 4B, Suite 200"
            disabled={readOnly}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="City"
              value={address?.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              error={errors.city}
              placeholder="New York"
              required
              disabled={readOnly}
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-navy-900">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={address?.state || ''}
                onChange={(e) => handleFieldChange('state', e.target.value as 'NY' | 'CT' | 'NJ')}
                className={`w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 ${
                  readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
                required
                disabled={readOnly}
              >
                <option value="" className="text-gray-400">Select State</option>
                {STATES.map(state => (
                  <option key={state.value} value={state.value} className="text-gray-900">
                    {state.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Input
              label="ZIP Code"
              mask="zip"
              value={address?.zip_code || ''}
              onChange={handleZipChange}
              error={errors.zip_code}
              placeholder="10001"
              required
              disabled={readOnly}
            />
            {isValidating && (
              <div className="absolute right-3 top-9 text-sm text-navy-500">
                Validating...
              </div>
            )}
          </div>
          
          {validationMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              validationMessage.type === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : validationMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              {validationMessage.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AddressStep() {
  const { bookingData, updateBookingData, nextStep, errors, setError, clearError } = useBookingWizard();
  const [pickupValidation, setPickupValidation] = useState<{
    type: 'error' | 'warning' | 'success';
    message: string;
  } | null>(null);
  const [deliveryValidation, setDeliveryValidation] = useState<{
    type: 'error' | 'warning' | 'success';
    message: string;
  } | null>(null);
  const [pickupValidating, setPickupValidating] = useState(false);
  const [deliveryValidating, setDeliveryValidating] = useState(false);
  const [pickupDebounce, setPickupDebounce] = useState<NodeJS.Timeout | null>(null);
  const [deliveryDebounce, setDeliveryDebounce] = useState<NodeJS.Timeout | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const isBlade = bookingData.service_type === 'blade_transfer';

  useEffect(() => {
    if (isBlade && bookingData.blade_airport) {
      const airportAddress = AIRPORT_ADDRESSES[bookingData.blade_airport];
      updateBookingData({ delivery_address: airportAddress });
    }
  }, [isBlade, bookingData.blade_airport]);

  const validateZipCode = async (
    zipCode: string, 
    addressType: 'pickup' | 'delivery'
  ): Promise<boolean> => {
    if (!zipCode || zipCode.length < 5) return false;
    
    const setValidation = addressType === 'pickup' ? setPickupValidation : setDeliveryValidation;
    const setValidating = addressType === 'pickup' ? setPickupValidating : setDeliveryValidating;
    
    setValidating(true);
    setValidation(null);
    
    try {
      console.log(`🔍 Validating ${addressType} ZIP:`, zipCode);
      const response = await apiClient.post('/api/public/validate-zip/', { 
        zip_code: zipCode 
      });
      
      console.log(`📦 ZIP validation response for ${addressType}:`, response.data);
      
      const { is_serviceable, requires_surcharge, error } = response.data;
      
      if (!is_serviceable) {
        setValidation({
          type: 'error',
          message: error || 'This ZIP code is not in our service area.'
        });
        return false;
      }
      
      if (requires_surcharge) {
        console.log(`🚨 ${addressType} ZIP ${zipCode} REQUIRES SURCHARGE - Setting is_outside_core_area = true`);
        updateBookingData({ is_outside_core_area: true });
        setValidation({
          type: 'warning',
          message: '⚠️ This address includes a $220 distance surcharge.'
        });
        return true;
      }
      
      const otherAddressType = addressType === 'pickup' ? 'delivery' : 'pickup';
      const otherValidation = addressType === 'pickup' ? deliveryValidation : pickupValidation;
      
      if (!otherValidation || otherValidation.type !== 'warning') {
        console.log('✅ Both addresses in core area - clearing surcharge flag');
        updateBookingData({ is_outside_core_area: false });
      } else {
        console.log('⚠️ Other address still has surcharge - keeping flag true');
      }
      
      setValidation({
        type: 'success',
        message: '✓ This address is in our standard service area.'
      });
      return true;
      
    } catch (error) {
      console.error('ZIP validation error:', error);
      return true;
    } finally {
      setValidating(false);
    }
  };

  const handlePickupZipChange = (zipCode: string) => {
    if (pickupDebounce) {
      clearTimeout(pickupDebounce);
    }
    
    setPickupValidation(null);
    
    if (zipCode.length === 5) {
      const timeout = setTimeout(() => {
        validateZipCode(zipCode, 'pickup');
      }, 500);
      
      setPickupDebounce(timeout);
    }
  };

  const handleDeliveryZipChange = (zipCode: string) => {
    if (isBlade) return;
    
    if (deliveryDebounce) {
      clearTimeout(deliveryDebounce);
    }
    
    setDeliveryValidation(null);
    
    if (zipCode.length === 5) {
      const timeout = setTimeout(() => {
        validateZipCode(zipCode, 'delivery');
      }, 500);
      
      setDeliveryDebounce(timeout);
    }
  };

  const handlePickupChange = (address: BookingAddress) => {
    updateBookingData({ pickup_address: address });
    if (address.address_line_1) clearError('pickup_address');
    if (address.city) clearError('pickup_city');
    if (address.zip_code) clearError('pickup_zip');
  };

  const handleDeliveryChange = (address: BookingAddress) => {
    if (isBlade) return;
    
    updateBookingData({ delivery_address: address });
    if (address.address_line_1) clearError('delivery_address');
    if (address.city) clearError('delivery_city');
    if (address.zip_code) clearError('delivery_zip');
  };

  const handleContinue = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 ADDRESS STEP - CONTINUE CLICKED');
    console.log('═══════════════════════════════════════');
    console.log('📍 Pickup ZIP:', bookingData.pickup_address?.zip_code);
    console.log('📍 Delivery ZIP:', bookingData.delivery_address?.zip_code);
    console.log('🏴 is_outside_core_area FLAG:', bookingData.is_outside_core_area);
    console.log('⚠️ Pickup validation:', pickupValidation);
    console.log('⚠️ Delivery validation:', deliveryValidation);
    
    if (pickupValidation?.type === 'error' || deliveryValidation?.type === 'error') {
      setError('general', 'Please enter valid service area addresses.');
      return;
    }

    const pickup = bookingData.pickup_address;
    const delivery = bookingData.delivery_address;
    let hasErrors = false;

    if (!pickup?.address_line_1) {
      setError('pickup_address', 'Pickup address is required');
      hasErrors = true;
    }
    if (!pickup?.city) {
      setError('pickup_city', 'Pickup city is required');
      hasErrors = true;
    }
    if (!pickup?.zip_code) {
      setError('pickup_zip', 'Pickup ZIP code is required');
      hasErrors = true;
    }

    if (!isBlade) {
      if (!delivery?.address_line_1) {
        setError('delivery_address', 'Delivery address is required');
        hasErrors = true;
      }
      if (!delivery?.city) {
        setError('delivery_city', 'Delivery city is required');
        hasErrors = true;
      }
      if (!delivery?.zip_code) {
        setError('delivery_zip', 'Delivery ZIP code is required');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      console.log('❌ Validation errors, stopping');
      return;
    }

    setIsRecalculating(true);
    try {
      const payload: any = {
        service_type: bookingData.service_type,
        pickup_date: bookingData.pickup_date,
        is_outside_core_area: bookingData.is_outside_core_area || false,
      };

      if (bookingData.service_type === 'mini_move') {
        payload.mini_move_package_id = bookingData.mini_move_package_id;
        payload.include_packing = bookingData.include_packing;
        payload.include_unpacking = bookingData.include_unpacking;
        payload.pickup_time = bookingData.pickup_time;
        payload.specific_pickup_hour = bookingData.specific_pickup_hour;
        payload.coi_required = bookingData.coi_required || false;
      } else if (bookingData.service_type === 'standard_delivery') {
        payload.standard_delivery_item_count = bookingData.standard_delivery_item_count;
        payload.is_same_day_delivery = bookingData.is_same_day_delivery;
        payload.specialty_item_ids = bookingData.specialty_item_ids;
      } else if (bookingData.service_type === 'specialty_item') {
        payload.specialty_item_ids = bookingData.specialty_item_ids;
      }

      console.log('📤 SENDING PRICING REQUEST WITH PAYLOAD:', JSON.stringify(payload, null, 2));
      const response = await apiClient.post('/api/public/pricing-preview/', payload);
      
      console.log('📥 PRICING RESPONSE RECEIVED:', JSON.stringify(response.data.pricing, null, 2));
      console.log('💰 Geographic Surcharge in response:', response.data.pricing.geographic_surcharge_dollars);
      
      updateBookingData({ pricing_data: response.data.pricing });
      console.log('✅ Pricing saved to store');
      
    } catch (error) {
      console.error('❌ Failed to recalculate pricing:', error);
      setError('general', 'Failed to calculate pricing. Please try again.');
      setIsRecalculating(false);
      return;
    }
    
    setIsRecalculating(false);
    console.log('═══════════════════════════════════════');
    nextStep();
  };

  return (
    <div className="space-y-8">
      <AddressForm
        title="Pickup Address"
        address={bookingData.pickup_address}
        onAddressChange={handlePickupChange}
        errors={errors}
        onZipChange={handlePickupZipChange}
        validationMessage={pickupValidation}
        isValidating={pickupValidating}
      />

      {!isBlade && (
        <AddressForm
          title="Delivery Address"
          address={bookingData.delivery_address}
          onAddressChange={handleDeliveryChange}
          errors={errors}
          onZipChange={handleDeliveryZipChange}
          validationMessage={deliveryValidation}
          isValidating={deliveryValidating}
        />
      )}

      {isBlade && bookingData.delivery_address && (
        <AddressForm
          title="Delivery Address (Airport)"
          address={bookingData.delivery_address}
          onAddressChange={handleDeliveryChange}
          errors={{}}
          readOnly={true}
        />
      )}

      {errors.general && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          {errors.general}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={isRecalculating}
          size="lg"
        >
          {isRecalculating ? 'Recalculating Pricing...' : 'Continue to Review & Payment →'}
        </Button>
      </div>
    </div>
  );
}