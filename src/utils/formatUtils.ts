/**
 * Shared formatting utilities used across multiple pages.
 * Consolidates duplicate formatHours / formatDuration helpers.
 */

/**
 * Formats total seconds into a compact human-readable string.
 * e.g. 7200 → "2.0h", 1800 → "30m"
 */
export function formatHours(seconds: number): string {
  const h = (seconds || 0) / 3600;
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
}

/**
 * Formats total seconds into "Xh Ym" or "Ym".
 * e.g. 5400 → "1h 30m", 300 → "5m"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
