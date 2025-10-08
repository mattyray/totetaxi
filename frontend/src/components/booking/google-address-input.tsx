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

    try {
      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us'] },
        fields: ['address_components', 'formatted_address', 'geometry']
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place?.address_components) {
          // Call the parent's place selected handler
          onPlaceSelected(place);
          
          // IMPORTANT: Clear the input after selection
          // This prevents the full formatted address from showing
          // The parent component will set the proper street address only
          if (inputRef.current) {
            inputRef.current.blur(); // Remove focus to trigger any blur handlers
          }
        }
      });

      // Prevent Google from filling the input with formatted address
      // Listen for the DOM mutation when Google tries to fill the input
      if (inputRef.current) {
        inputRef.current.addEventListener('focus', () => {
          // Store the current value when focused
          const currentValue = inputRef.current?.value || '';
          
          // Use setTimeout to check after Google fills it
          setTimeout(() => {
            const newValue = inputRef.current?.value || '';
            // If Google added city/state/zip to the input, remove it
            if (newValue.includes(',') && newValue !== currentValue) {
              // Google filled it with formatted address, keep only street
              const streetOnly = newValue.split(',')[0].trim();
              if (inputRef.current) {
                onChange(streetOnly);
              }
            }
          }, 100);
        });
      }

    } catch (error) {
      console.error('Error initializing Google Autocomplete:', error);
      setApiError(true);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, onPlaceSelected, onChange, disabled]);

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