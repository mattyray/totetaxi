// Singleton pattern to load Google Maps API only once
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsAPI(): Promise<void> {
  // Already loaded
  if (isLoaded || (typeof window !== 'undefined' && window.google?.maps?.places)) {
    return Promise.resolve();
  }

  // Currently loading, return existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      resolve();
    };
    
    script.onerror = () => {
      isLoading = false;
      loadPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });

  return loadPromise;
}