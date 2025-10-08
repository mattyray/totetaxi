
// frontend/src/components/booking/google-address-input.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    // Check if Google is already loaded
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Load Google Places API
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      script.onerror = () => {
        console.error('Failed to load Google Places API');
        setApiError(true);
      };
      document.head.appendChild(script);

      // Timeout fallback
      setTimeout(() => {
        if (!isLoaded) {
          console.warn('Google Places API loading timeout');
          setApiError(true);
        }
      }, 5000);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current || disabled) return;

    try {
      // Initialize autocomplete with restrictions
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us'] },
        fields: ['address_components', 'formatted_address', 'geometry']
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.address_components) {
          onPlaceSelected(place);
        }
      });
    } catch (error) {
      console.error('Error initializing Google Autocomplete:', error);
      setApiError(true);
    }
  }, [isLoaded, onPlaceSelected, disabled]);

  // Fallback to regular input if API fails
  if (apiError) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-navy-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 text-base border rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-navy-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 text-base border rounded-md shadow-sm focus:border-navy-500 focus:ring-navy-500 text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isLoaded && !apiError && (
        <p className="text-xs text-navy-500">Loading address suggestions...</p>
      )}
    </div>
  );
}