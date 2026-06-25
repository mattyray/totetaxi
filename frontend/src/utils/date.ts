// Timezone-safe helpers for date-only values (YYYY-MM-DD).
//
// The backend stores pickup_date as a DateField and serializes it as a plain
// 'YYYY-MM-DD' string with no time or timezone. Using `new Date(str)` parses
// that as midnight UTC, which is the *previous evening* in any negative-offset
// zone (e.g. America/New_York) — shifting bookings to the wrong calendar day.
// Conversely, `date.toISOString()` on a locally-constructed date shifts the
// other way for positive-offset browsers. Always go through these helpers when
// converting between Date objects and date-only strings for display/matching.

/** Format a Date as a local 'YYYY-MM-DD' string (no UTC conversion). */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a 'YYYY-MM-DD' string into a Date at local midnight (not UTC). */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}
