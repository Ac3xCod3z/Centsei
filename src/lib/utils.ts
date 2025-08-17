import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export const parseDateInTimezone = (dateString: string, timeZone: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return toZonedTime(new Date(year, month - 1, day), timeZone);
};

/** Recursively removes all `undefined` fields so Firestore doesn't choke */
export const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(stripUndefined) as any;
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v as any);
    }
    return out as T;
  }
  return value;
};
