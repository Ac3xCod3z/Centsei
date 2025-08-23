// src/lib/time.ts
import { toZonedTime, format as formatInTimeZone } from 'date-fns-tz';

/**
 * Parses a date string or object and interprets it as being in the specified timezone.
 * This is the single source of truth for converting stored date strings into Date objects.
 * @param d The date string (YYYY-MM-DD), number, or Date object.
 * @param tz The IANA timezone string (e.g., "America/New_York").
 * @returns A Date object correctly representing the instant in the given timezone.
 */
export function parseDateInTimezone(d: Date | string | number, tz: string): Date {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return toZonedTime(date, tz);
}

/**
 * Formats a Date object into a "yyyy-MM-dd" string, according to a specific timezone.
 * This is useful for getting the "local date" part of a Date object in a given zone.
 * @param date The Date object to format.
 * @param tz The IANA timezone string.
 * @returns The formatted date string "yyyy-MM-dd".
 */
export function formatInTimezone(date: Date, tz: string): string {
    return formatInTimeZone(date, 'yyyy-MM-dd', { timeZone: tz });
}
