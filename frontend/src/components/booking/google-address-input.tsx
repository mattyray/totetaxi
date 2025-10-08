'use client';

import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiError, setApiError] = useState(false);
  const lastProcessedValue = useRef<string>('');

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
        } else {
          console.error('Google Maps loaded but places library not available');
          setApiError(true);
        }
      })
      .catch((error) => {
        console.error('Failed to load Google Maps API:', error);
        setApiError(true);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current || disabled) return;

    if (!window.google?.maps?.places?.Autocomplete) {
      console.error('Google Places Autocomplete not available');
      setApiError(true);
      return;
    }

    // Declare function here so it's accessible in cleanup
    const checkForFormattedAddress = () => {
      const currentValue = inputRef.current?.value || '';
      
      // Check if Google filled it with formatted address (contains comma)
      // And we haven't processed this exact value yet
      if (currentValue.includes(',') && currentValue !== lastProcessedValue.current) {
        // Google filled the input, but place_changed hasn't fired yet
        // Give it a moment, then try to get the place manually
        setTimeout(() => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.address_components && inputRef.current?.value.includes(',')) {
            lastProcessedValue.current = inputRef.current?.value || '';
            onPlaceSelected(place);
          }
        }, 100);
      }
    };

    try {
      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us'] },
        fields: ['address_components', 'formatted_address', 'geometry']
      });

      // Primary handler: place_changed event
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place?.address_components) {
          lastProcessedValue.current = inputRef.current?.value || '';
          onPlaceSelected(place);
        }
      });

      // Listen for input changes
      if (inputRef.current) {
        inputRef.current.addEventListener('input', checkForFormattedAddress);
        
        // Also check on blur in case they tabbed through
        const blurHandler = () => {
          setTimeout(checkForFormattedAddress, 200);
        };
        inputRef.current.addEventListener('blur', blurHandler);
      }

    } catch (error) {
      console.error('Error initializing Google Autocomplete:', error);
      setApiError(true);
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      if (inputRef.current) {
        inputRef.current.removeEventListener('input', checkForFormattedAddress);
      }
      autocompleteRef.current = null;
    };
  }, [isLoaded, onPlaceSelected, disabled]);

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
        <p className="text-xs text-orange-600">⚠️ Address autocomplete unavailable. Please enter address manually.</p>
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
        autoComplete="off"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isLoaded && !apiError && (
        <p className="text-xs text-navy-500">⏳ Loading address suggestions...</p>
      )}
    </div>
  );
}