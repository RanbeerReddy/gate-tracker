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

/**
 * Returns the Monday (start of calendar week) as 'YYYY-MM-DD' in local time.
 * Standardizes Monday → Sunday calendar week across Dashboard, Goals, Calendar, and Analytics.
 */
export function getStartOfWeek(d: Date = new Date()): string {
  const current = new Date(d);
  const day = current.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diffToMonday);
  return formatLocalDate(current);
}

/**
 * Returns the Sunday (end of calendar week) as 'YYYY-MM-DD' in local time.
 */
export function getEndOfWeek(d: Date = new Date()): string {
  const current = new Date(d);
  const day = current.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  current.setDate(current.getDate() + diffToSunday);
  return formatLocalDate(current);
}

/**
 * Returns the 1st of the current month as 'YYYY-MM-DD' in local time.
 */
export function getStartOfMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Calculates calendar days remaining between today and target date.
 */
export function getDaysRemaining(targetDateStr: string, fromDate: Date = new Date()): { daysRemaining: number; isPast: boolean } {
  const target = parseLocalDate(targetDateStr);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - from.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    daysRemaining: Math.max(0, diffDays),
    isPast: diffDays < 0,
  };
}
