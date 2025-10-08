'use client';

import { useEffect, useState } from 'react';
import { useBookingWizard, type BookingAddress } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

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
  onZipBlur?: () => void;
  validationMessage?: {
    type: 'error' | 'warning' | 'success';
    message: string;
  } | null;
}

function AddressForm({ 
  title, 
  address, 
  onAddressChange, 
  errors, 
  readOnly = false,
  onZipBlur,
  validationMessage
}: AddressFormProps) {
  const handleFieldChange = (field: keyof BookingAddress, value: string) => {
    if (readOnly) return;
    
    onAddressChange({
      ...address,
      [field]: value
    } as BookingAddress);
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
          <Input
            label="Street Address"
            value={address?.address_line_1 || ''}
            onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
            error={errors.address_line_1}
            placeholder="123 Main Street"
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
          
          <Input
            label="ZIP Code"
            mask="zip"
            value={address?.zip_code || ''}
            onChange={(e) => handleFieldChange('zip_code', e.target.value)}
            onBlur={onZipBlur}
            error={errors.zip_code}
            placeholder="10001"
            required
            disabled={readOnly}
          />
          
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
    if (!zipCode) return false;
    
    const setValidation = addressType === 'pickup' ? setPickupValidation : setDeliveryValidation;
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
      
      if (requires_surcharge) {
        setValidation({
          type: 'warning',
          message: '⚠️ This address includes a $175 distance surcharge.'
        });
        return true;
      }
      
      setValidation({
        type: 'success',
        message: '✓ This address is in our standard service area.'
      });
      return true;
      
    } catch (error) {
      console.error('ZIP validation error:', error);
      return true;
    }
  };

  const handlePickupChange = (address: BookingAddress) => {
    updateBookingData({ pickup_address: address });
    if (address.address_line_1) clearError('pickup_address');
    if (address.city) clearError('pickup_city');
    if (address.zip_code) clearError('pickup_zip');
    
    // Clear validation when ZIP changes
    if (address.zip_code !== bookingData.pickup_address?.zip_code) {
      setPickupValidation(null);
    }
  };

  const handleDeliveryChange = (address: BookingAddress) => {
    if (isBlade) return;
    
    updateBookingData({ delivery_address: address });
    if (address.address_line_1) clearError('delivery_address');
    if (address.city) clearError('delivery_city');
    if (address.zip_code) clearError('delivery_zip');
    
    // Clear validation when ZIP changes
    if (address.zip_code !== bookingData.delivery_address?.zip_code) {
      setDeliveryValidation(null);
    }
  };

  const handlePickupZipBlur = async () => {
    const zipCode = bookingData.pickup_address?.zip_code;
    if (zipCode) {
      await validateZipCode(zipCode, 'pickup');
    }
  };

  const handleDeliveryZipBlur = async () => {
    if (isBlade) return;
    
    const zipCode = bookingData.delivery_address?.zip_code;
    if (zipCode) {
      await validateZipCode(zipCode, 'delivery');
    }
  };

  const fillCommonRoutes = (route: 'manhattan-hamptons' | 'brooklyn-manhattan' | 'manhattan-westchester' | 'manhattan-connecticut' | 'manhattan-jfk' | 'manhattan-ewr') => {
    switch (route) {
      case 'manhattan-hamptons':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.hamptons,
          special_instructions: 'Test booking - Manhattan to Hamptons route'
        });
        break;
      case 'brooklyn-manhattan':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.brooklyn,
          delivery_address: TEST_ADDRESSES.manhattan,
          special_instructions: 'Test booking - Brooklyn to Manhattan route'
        });
        break;
      case 'manhattan-westchester':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.westchester,
          special_instructions: 'Test booking - Manhattan to Westchester route'
        });
        break;
      case 'manhattan-connecticut':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: TEST_ADDRESSES.connecticut,
          special_instructions: 'Test booking - Manhattan to Connecticut route'
        });
        break;
      case 'manhattan-jfk':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: AIRPORT_ADDRESSES.JFK,
          special_instructions: 'Test booking - Manhattan to JFK Airport'
        });
        break;
      case 'manhattan-ewr':
        updateBookingData({
          pickup_address: TEST_ADDRESSES.manhattan,
          delivery_address: AIRPORT_ADDRESSES.EWR,
          special_instructions: 'Test booking - Manhattan to Newark Airport'
        });
        break;
    }
  };

  const handleContinue = () => {
    // Block if there are ZIP validation errors
    if (pickupValidation?.type === 'error' || deliveryValidation?.type === 'error') {
      setError('general', 'Please enter valid service area addresses.');
      return;
    }
    
    let hasErrors = false;

    if (!bookingData.pickup_address?.address_line_1) {
      setError('pickup_address', 'Pickup address is required');
      hasErrors = true;
    }
    if (!bookingData.pickup_address?.city) {
      setError('pickup_city', 'City is required');
      hasErrors = true;
    }
    if (!bookingData.pickup_address?.state) {
      setError('pickup_state', 'State is required');
      hasErrors = true;
    }
    if (!bookingData.pickup_address?.zip_code) {
      setError('pickup_zip', 'ZIP code is required');
      hasErrors = true;
    }

    if (isBlade && bookingData.pickup_address?.state !== 'NY') {
      setError('pickup_state', 'BLADE service requires NYC pickup address (NY state only)');
      hasErrors = true;
    }

    if (!bookingData.delivery_address?.address_line_1) {
      setError('delivery_address', 'Delivery address is required');
      hasErrors = true;
    }
    if (!bookingData.delivery_address?.city) {
      setError('delivery_city', 'City is required');
      hasErrors = true;
    }
    if (!bookingData.delivery_address?.state) {
      setError('delivery_state', 'State is required');
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
    bookingData.pickup_address?.state &&
    bookingData.pickup_address?.zip_code &&
    bookingData.delivery_address?.address_line_1 &&
    bookingData.delivery_address?.city &&
    bookingData.delivery_address?.state &&
    bookingData.delivery_address?.zip_code &&
    pickupValidation?.type !== 'error' &&
    deliveryValidation?.type !== 'error';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-navy-700">
          {isBlade 
            ? 'Where should we pick up your bags in NYC?'
            : 'Where should we pick up and deliver your items?'}
        </p>
        <p className="text-sm text-navy-600 mt-1">
          {isBlade
            ? 'BLADE service is only available from NYC addresses. Airport delivery is automatic.'
            : 'We service Manhattan, Brooklyn, the Hamptons, and surrounding areas.'}
        </p>
        
        {!isBlade && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-navy-500">Quick Fill - Common Routes:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('manhattan-hamptons')}
                className="text-xs"
              >
                Manhattan → Hamptons
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('brooklyn-manhattan')}
                className="text-xs"
              >
                Brooklyn → Manhattan
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('manhattan-westchester')}
                className="text-xs"
              >
                Manhattan → Westchester
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('manhattan-connecticut')}
                className="text-xs"
              >
                Manhattan → Connecticut
              </Button>
            </div>
          </div>
        )}
        
        {isBlade && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-navy-500">Quick Fill - BLADE Routes:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('manhattan-jfk')}
                className="text-xs"
              >
                Manhattan → JFK
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fillCommonRoutes('manhattan-ewr')}
                className="text-xs"
              >
                Manhattan → EWR
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddressForm
        title={isBlade ? 'Pickup Address (NYC Only)' : 'Pickup Address'}
        address={bookingData.pickup_address}
        onAddressChange={handlePickupChange}
        errors={{
          address_line_1: errors.pickup_address || '',
          city: errors.pickup_city || '',
          state: errors.pickup_state || '',
          zip_code: errors.pickup_zip || ''
        }}
        onZipBlur={handlePickupZipBlur}
        validationMessage={pickupValidation}
      />

      {isBlade && bookingData.pickup_address?.state && bookingData.pickup_address.state !== 'NY' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent>
            <p className="text-sm text-orange-800">
              <strong>BLADE Restriction:</strong> BLADE service is only available for NYC (NY state) pickups. 
              Please enter a New York address for pickup.
            </p>
          </CardContent>
        </Card>
      )}

      <AddressForm
        title={isBlade ? `Delivery Address (${bookingData.blade_airport})` : 'Delivery Address'}
        address={bookingData.delivery_address}
        onAddressChange={handleDeliveryChange}
        errors={{
          address_line_1: errors.delivery_address || '',
          city: errors.delivery_city || '',
          state: errors.delivery_state || '',
          zip_code: errors.delivery_zip || ''
        }}
        readOnly={isBlade}
        onZipBlur={handleDeliveryZipBlur}
        validationMessage={deliveryValidation}
      />

      <Card variant="default" className="p-6">
        <CardContent className="p-0">
          <label className="block text-sm font-medium text-navy-900 mb-3">
            Special Instructions (Optional)
          </label>
          <textarea
            value={bookingData.special_instructions || ''}
            onChange={(e) => updateBookingData({ special_instructions: e.target.value })}
            placeholder={isBlade 
              ? 'Building access codes, doorman instructions, or any special notes for pickup...'
              : 'Any special delivery instructions, building access codes, or notes for our team...'}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500 text-gray-900 placeholder:text-gray-400 bg-white"
          />
          <p className="text-sm text-navy-600 mt-2">
            Include building access codes, doorman instructions, or any special handling requests.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          size="lg"
        >
          Continue to {bookingData.service_type === 'blade_transfer' ? 'Review' : 'Your Info'} →
        </Button>
      </div>
    </div>
  );
}