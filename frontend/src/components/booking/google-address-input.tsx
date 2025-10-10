// frontend/src/components/booking/google-address-input.tsx
'use client';

import Autocomplete from 'react-google-autocomplete';

interface GoogleAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function GoogleAddressInput({
  label,
  value,
  onChange,
  onPlaceSelected,
  error,
  placeholder,
  required,
  disabled
}: GoogleAddressInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-navy-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <Autocomplete
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
        onPlaceSelected={(place) => {
          console.log('✅ Place selected:', place);
          onPlaceSelected(place);
        }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        options={{
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
        }}
        className={`w-full px-4 py-3 text-base border rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      />
      
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}