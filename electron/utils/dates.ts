/**
 * Backend Date Handling Utilities for Electron Main Process
 * 
 * Standardizes Monday → Sunday calendar week, local YYYY-MM-DD formatting,
 * and date arithmetic for SQLite queries.
 */

export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
 * Returns Monday (00:00:00) of the current week as 'YYYY-MM-DD'
 */
export function getStartOfWeek(d: Date = new Date()): string {
  const current = new Date(d);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diffToMonday);
  return formatLocalDate(current);
}

/**
 * Returns the 1st day of the current month as 'YYYY-MM-DD'
 */
export function getStartOfMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Calculates calendar days difference.
 */
export function calculateDaysRemaining(targetDateStr: string, fromDate: Date = new Date()): { daysRemaining: number; isPast: boolean } {
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
