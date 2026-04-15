/**
 * Google Analytics 4 event tracking.
 *
 * Page views are handled automatically by <GoogleAnalytics> in layout.tsx.
 * Use `trackEvent()` for custom conversion events.
 *
 * No-op if GA isn't loaded (e.g., local dev without NEXT_PUBLIC_GA_ID).
 */

type GtagFn = (command: 'event', eventName: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

// Named helpers for the events we actually fire — keeps call sites consistent
export const analytics = {
  // `click_source` (not `source`) intentionally — GA4 has a built-in `source`
  // dimension for traffic attribution, and passing our own `source` param
  // collides with it in the Acquisition reports.
  startBooking: (clickSource: string) => trackEvent('start_booking', { click_source: clickSource }),
  bookingStepCompleted: (step: number, stepName: string) =>
    trackEvent('booking_step_completed', { step, step_name: stepName }),
  bookingCompleted: (params: { value: number; booking_number: string; service_type: string }) =>
    trackEvent('booking_completed', {
      currency: 'USD',
      value: params.value,
      booking_number: params.booking_number,
      service_type: params.service_type,
    }),
  chatOpened: () => trackEvent('chat_opened'),
  chatMessageSent: () => trackEvent('chat_message_sent'),
};
