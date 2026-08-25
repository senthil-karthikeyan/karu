import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Normalizes input into a valid Date object.
 */
function toDate(date: Date | string | number): Date {
  if (typeof date === "string") {
    return parseISO(date);
  }
  return new Date(date);
}

/**
 * Formats a date using date-fns format string.
 * Defaults to "MMM dd, yyyy" (e.g., "Aug 17, 2026").
 */
export function formatDate(
  date: Date | string | number,
  formatString = "MMM dd, yyyy"
): string {
  const d = toDate(date);
  if (!isValid(d)) return "Invalid date";
  return format(d, formatString);
}

/**
 * Formats a date with time.
 * Defaults to "MMM dd, yyyy • h:mm a" (e.g., "Aug 17, 2026 • 11:30 PM").
 */
export function formatDateTime(
  date: Date | string | number,
  formatString = "MMM dd, yyyy • h:mm a"
): string {
  const d = toDate(date);
  if (!isValid(d)) return "Invalid date";
  return format(d, formatString);
}

/**
 * Formats relative distance to now (e.g., "3 hours ago", "2 days ago").
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = toDate(date);
  if (!isValid(d)) return "Invalid date";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Validates if the input can be parsed into a valid Date.
 */
export function isValidDate(date: unknown): boolean {
  if (!date) return false;
  if (date instanceof Date) return isValid(date);
  if (typeof date === "string" || typeof date === "number") {
    return isValid(new Date(date));
  }
  return false;
}
