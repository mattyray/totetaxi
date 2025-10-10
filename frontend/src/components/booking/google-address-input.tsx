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
  
  // 🔥 NEW: Track when a place is being selected to prevent onChange interference
  const isSelectingPlace = useRef(false);
  const selectionTimeout = useRef<NodeJS.Timeout | null>(null);

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
      // Initialize autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us'] },
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      });

      // 🔥 FIXED: Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        console.log('📍 Place changed event fired:', place);
        
        // Set flag to prevent onChange from interfering
        isSelectingPlace.current = true;
        
        // Clear any existing timeout
        if (selectionTimeout.current) {
          clearTimeout(selectionTimeout.current);
        }
        
        // Check if we have address components (might not be loaded yet)
        if (place?.address_components) {
          console.log('✅ Address components available, parsing...');
          
          // Immediately call parent handler
          onPlaceSelected(place);
          
          // Reset flag after a short delay to allow state updates
          selectionTimeout.current = setTimeout(() => {
            isSelectingPlace.current = false;
          }, 100);
        } else {
          console.warn('⚠️ No address components yet. User may need to select again.');
          
          // Reset flag more quickly if no components
          selectionTimeout.current = setTimeout(() => {
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
      if (selectionTimeout.current) {
        clearTimeout(selectionTimeout.current);
      }
    };
  }, [isLoaded, onPlaceSelected, disabled]);

  // 🔥 FIXED: Modified onChange to ignore events during place selection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If user is selecting from autocomplete, ignore this onChange
    if (isSelectingPlace.current) {
      console.log('🚫 Ignoring onChange during place selection');
      return;
    }
    
    // Otherwise, it's manual typing - allow it
    onChange(e.target.value);
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
        onChange={handleInputChange}  // 🔥 Use new handler
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