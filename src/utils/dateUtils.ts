/**
 * Explicit Local Date Handling Utilities
 * 
 * Prevents UTC timezone shifting bugs (e.g. where calling .toISOString()
 * on a local midnight Date shifts the date to the previous day in timezones like IST UTC+5:30).
 */

/**
 * Formats a Date object as a local calendar date string 'YYYY-MM-DD'.
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a 'YYYY-MM-DD' calendar date string into a local Date object set to local midnight.
 * Avoids new Date('YYYY-MM-DD') UTC conversion drift.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

