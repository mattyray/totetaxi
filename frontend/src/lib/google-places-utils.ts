import type { BookingAddress } from '@/stores/booking-store';

export function parseGooglePlace(
  place: google.maps.places.PlaceResult
): Partial<BookingAddress> | null {
  if (!place.address_components) {
    console.warn('No address components in place result');
    return null;
  }

  const components = place.address_components;

  // Extract components with proper typing
  const streetNumber = components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('street_number')
  )?.long_name || '';
  
  const route = components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('route')
  )?.long_name || '';
  
  const city = components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('locality')
  )?.long_name || 
  components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('sublocality')
  )?.long_name || '';
  
  const state = components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('administrative_area_level_1')
  )?.short_name || '';
  
  const zipCode = components.find((c: google.maps.GeocoderAddressComponent) => 
    c.types.includes('postal_code')
  )?.long_name || '';

  // Validate required fields
  if (!city || !state || !zipCode) {
    console.warn('Missing required address components:', { 
      city, state, zipCode 
    });
    return null;
  }

  // Validate state is in service area
  if (!['NY', 'CT', 'NJ'].includes(state)) {
    console.warn('Address outside service states:', state);
    return null;
  }

  const address_line_1 = `${streetNumber} ${route}`.trim();

  if (!address_line_1) {
    console.warn('No street address found');
    return null;
  }

  return {
    address_line_1,
    address_line_2: '',
    city,
    state: state as 'NY' | 'CT' | 'NJ',
    zip_code: zipCode
  };
}

export function formatAddressForDisplay(address: BookingAddress): string {
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.zip_code
  ].filter(Boolean);

  return parts.join(', ');
}