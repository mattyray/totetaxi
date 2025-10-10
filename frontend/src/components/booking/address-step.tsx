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

const TEST_ADDRESSES = {
  manhattan: {
    address_line_1: '123 Park Avenue',
    address_line_2: 'Apt 5B',
    city: 'New York',
    state: 'NY' as const,
    zip_code: '10001'
  },
  hamptons: {
    address_line_1: '456 Ocean Drive',
    address_line_2: 'Suite 12',
    city: 'Southampton',
    state: 'NY' as const,
    zip_code: '11968'
  },
  brooklyn: {
    address_line_1: '789 Atlantic Avenue',
    city: 'Brooklyn',
    state: 'NY' as const,
    zip_code: '11217'
  },
  westchester: {
    address_line_1: '321 Main Street',
    city: 'White Plains',
    state: 'NY' as const,
    zip_code: '10601'
  },
  connecticut: {
    address_line_1: '654 Elm Street',
    city: 'Greenwich',
    state: 'CT' as const,
    zip_code: '06830'
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
    
    // Trigger validation when ZIP is 5 digits
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
                console.log('✅ Parsed address:', parsed);
                
                // Auto-fill all address fields
                onAddressChange({
                  ...address,
                  ...parsed
                } as BookingAddress);
                
                // Immediately trigger ZIP validation
                if (onZipChange && parsed.zip_code) {
                  // Use requestAnimationFrame to ensure state has updated
                  requestAnimationFrame(() => {
                    onZipChange(parsed.zip_code!);
                  });
                }
              } else {
                console.error('❌ Failed to parse Google Place');
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
          
          {/* ZIP Validation Message */}
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
      const response = await apiClient.post('/api/public/validate-zip/', { 
        zip_code: zipCode 
      });
      
      const { is_serviceable, requires_surcharge, error } = response.data;
      
      if (!is_serviceable) {
        setValidation({
          type: 'error',
          message: error || 'This ZIP code is not in our service area.'
        });
        return false;
      }
      
      // ✅ FIX: Update is_outside_core_area flag when either address needs surcharge
      if (requires_surcharge) {
        updateBookingData({ is_outside_core_area: true });
        setValidation({
          type: 'warning',
          message: '⚠️ This address includes a $220 distance surcharge.'
        });
        return true;
      }
      
      // ✅ FIX: Only clear flag if BOTH addresses are in core area
      // Check the OTHER address to see if we should keep the flag
      const otherAddressType = addressType === 'pickup' ? 'delivery' : 'pickup';
      const otherValidation = addressType === 'pickup' ? deliveryValidation : pickupValidation;
      
      // Only clear flag if the other address doesn't have a surcharge warning
      if (!otherValidation || otherValidation.type !== 'warning') {
        updateBookingData({ is_outside_core_area: false });
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
    // Clear previous debounce
    if (pickupDebounce) {
      clearTimeout(pickupDebounce);
    }
    
    // Clear validation while typing
    setPickupValidation(null);
    
    // Set new debounce
    if (zipCode.length === 5) {
      const timeout = setTimeout(() => {
        validateZipCode(zipCode, 'pickup');
      }, 500); // Wait 500ms after user stops typing
      
      setPickupDebounce(timeout);
    }
  };

  const handleDeliveryZipChange = (zipCode: string) => {
    if (isBlade) return;
    
    // Clear previous debounce
    if (deliveryDebounce) {
      clearTimeout(deliveryDebounce);
    }
    
    // Clear validation while typing
    setDeliveryValidation(null);
    
    // Set new debounce
    if (zipCode.length === 5) {
      const timeout = setTimeout(() => {
        validateZipCode(zipCode, 'delivery');
      }, 500); // Wait 500ms after user stops typing
      
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

  const fillCommonRoutes = (route: 'manhattan-hamptons' | 'brooklyn-manhattan' | 'manhattan-westchester' | 'manhattan-connecticut' | 'manhattan-jfk' | 'manhattan-ewr') => {
    switch (route) {
      case 'manhattan-hamptons':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.hamptons,
          special_instructions: 'Test booking - Manhattan to Hamptons route'
        });
        // Trigger validation for both addresses
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'pickup');
          validateZipCode(TEST_ADDRESSES.hamptons.zip_code, 'delivery');
        }, 100);
        break;
      case 'brooklyn-manhattan':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.brooklyn,
          delivery_address: TEST_ADDRESSES.manhattan,
          special_instructions: 'Test booking - Brooklyn to Manhattan route'
        });
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.brooklyn.zip_code, 'pickup');
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'delivery');
        }, 100);
        break;
      case 'manhattan-westchester':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.westchester,
          special_instructions: 'Test booking - Manhattan to Westchester route'
        });
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'pickup');
          validateZipCode(TEST_ADDRESSES.westchester.zip_code, 'delivery');
        }, 100);
        break;
      case 'manhattan-connecticut':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.connecticut,
          special_instructions: 'Test booking - Manhattan to Connecticut route'
        });
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'pickup');
          validateZipCode(TEST_ADDRESSES.connecticut.zip_code, 'delivery');
        }, 100);
        break;
      case 'manhattan-jfk':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: AIRPORT_ADDRESSES.JFK,
          special_instructions: 'Test booking - Manhattan to JFK Airport'
        });
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'pickup');
        }, 100);
        break;
      case 'manhattan-ewr':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: AIRPORT_ADDRESSES.EWR,
          special_instructions: 'Test booking - Manhattan to Newark Airport'
        });
        setTimeout(() => {
          validateZipCode(TEST_ADDRESSES.manhattan.zip_code, 'pickup');
        }, 100);
        break;
    }
  };

  const handleContinue = () => {
    // Block if there are ZIP validation errors
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

    if (!hasErrors) {
      nextStep();
    }
  };

  return (
    <div className="space-y-8">
      {process.env.NODE_ENV === 'development' && (
        <Card variant="elevated" className="p-6">
          <CardContent className="p-0">
            <h4 className="font-medium text-navy-900 mb-4">🧪 Test Routes (Dev Only)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('manhattan-hamptons')}
              >
                Manhattan → Hamptons
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('brooklyn-manhattan')}
              >
                Brooklyn → Manhattan
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('manhattan-westchester')}
              >
                Manhattan → Westchester ($220)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('manhattan-connecticut')}
              >
                Manhattan → CT ($220)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('manhattan-jfk')}
              >
                Manhattan → JFK
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fillCommonRoutes('manhattan-ewr')}
              >
                Manhattan → EWR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          size="lg"
        >
          Continue to Review & Payment →
        </Button>
      </div>
    </div>
  );
}