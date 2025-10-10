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
  
  // Track if we're in the middle of selecting a place
  const isSelectingPlace = useRef(false);

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
        } else {
          setApiError(true);
        }
      })
      .catch(() => {
        setApiError(true);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current || disabled) return;

    if (!window.google?.maps?.places?.Autocomplete) {
      setApiError(true);
      return;
    }

    try {
      // Initialize autocomplete with getPlaceDetails to ensure we get full data
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us'] },
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      });

      // CRITICAL: Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        console.log('📍 Place changed event:', place);
        
        // Set flag immediately
        isSelectingPlace.current = true;
        
        // Check if we have address components
        if (place && place.address_components && place.address_components.length > 0) {
          console.log('✅ Address components found:', place.address_components);
          
          // Clear the input field first to prevent showing formatted address
          if (inputRef.current) {
            inputRef.current.value = '';
          }
          
          // Call parent handler to parse and populate all fields
          onPlaceSelected(place);
          
          // Reset flag after a delay
          setTimeout(() => {
            isSelectingPlace.current = false;
          }, 100);
        } else {
          console.warn('⚠️ No address components - user may have pressed Enter without selecting');
          
          // If no components, restore the value and allow typing
          setTimeout(() => {
            isSelectingPlace.current = false;
          }, 50);
        }
      });

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
  }, [isLoaded, onPlaceSelected, disabled]);

  // Handle manual typing - allow it unless actively selecting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If selecting from dropdown, ignore manual typing
    if (isSelectingPlace.current) {
      console.log('🚫 Ignoring onChange during place selection');
      return;
    }
    
    // Normal typing - allow it
    onChange(e.target.value);
  };

  // Handle keyboard input to reset flag if user starts typing again
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If user presses any key other than Tab or Enter, they're manually typing
    if (e.key !== 'Tab' && e.key !== 'Enter') {
      isSelectingPlace.current = false;
    }
  };

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
        <p className="text-xs text-orange-600">⚠️ Address autocomplete unavailable. Please enter manually.</p>
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
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
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