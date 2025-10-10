'use client';

import { useEffect, useState } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
} from 'use-places-autocomplete';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';

interface GoogleAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  onBlur?: () => void;
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
  onBlur,
  error,
  placeholder,
  required,
  disabled
}: GoogleAddressInputProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
      });
  }, []);

  const {
    ready,
    suggestions: { status, data },
    setValue: setPlacesValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'us' },
    },
    debounce: 300,
    initOnMount: false, // Don't init until we manually call init
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    if (isLoaded) {
      setPlacesValue(inputValue);
    }
  };

  const handleSelect = async (description: string) => {
    onChange(description);
    setPlacesValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      
      if (results && results[0]) {
        const placeResult = results[0];
        
        console.log('✅ Place selected:', placeResult);

        const place: google.maps.places.PlaceResult = {
          address_components: placeResult.address_components,
          formatted_address: placeResult.formatted_address,
          geometry: placeResult.geometry,
          place_id: placeResult.place_id,
        };

        onPlaceSelected(place);
      }
    } catch (error) {
      console.error('❌ Error selecting place:', error);
    }
  };

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-medium text-navy-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 text-base border rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        autoComplete="off"
      />

      {/* Suggestions Dropdown */}
      {isLoaded && status === 'OK' && data.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion.description)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <div className="font-medium text-gray-900">{main_text}</div>
                <div className="text-sm text-gray-600">{secondary_text}</div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isLoaded && (
        <p className="text-xs text-navy-500">⏳ Loading address suggestions...</p>
      )}
    </div>
  );
}