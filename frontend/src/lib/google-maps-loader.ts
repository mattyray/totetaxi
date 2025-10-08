// frontend/src/lib/google-maps-loader.ts
// Singleton pattern to load Google Maps API only once
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsAPI(): Promise<void> {
  // Already loaded - verify it's actually working
  if (isLoaded && typeof window !== 'undefined' && window.google?.maps?.places?.Autocomplete) {
    return Promise.resolve();
  }

  // Check if already available (might have been loaded externally)
  if (typeof window !== 'undefined' && window.google?.maps?.places?.Autocomplete) {
    isLoaded = true;
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

    // Check if script already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );

    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(checkLoaded);
          isLoaded = true;
          isLoading = false;
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!isLoaded) {
          isLoading = false;
          loadPromise = null;
          reject(new Error('Google Maps API loading timeout'));
        }
      }, 10000);

      return;
    }

    // Create new script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait a bit for places library to be ready
      const checkReady = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(checkReady);
          isLoaded = true;
          isLoading = false;
          resolve();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!isLoaded) {
          isLoading = false;
          loadPromise = null;
          reject(new Error('Google Maps Places library not ready'));
        }
      }, 5000);
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