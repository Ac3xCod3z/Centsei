// src/lib/time.ts
import { toZonedTime } from "date-fns-tz"; // <-- correct package
export function parseDateInTimezone(d: Date|string|number, tz: string) {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return toZonedTime(date, tz);
}
