
'use client';

import { useEffect, useState } from 'react';

function coerceFromRaw<T>(raw: string, fallback: T): T {
  // accept JSON literals that JSON.parse would accept when quoted improperly
  if (raw === 'true' || raw === 'false') return (raw === 'true') as unknown as T;
  // numeric?
  const n = Number(raw);
  if (!Number.isNaN(n) && raw.trim() !== '') return n as unknown as T;
  // otherwise treat as string if fallback is a string; else give up
  if (typeof fallback === 'string') return raw as unknown as T;
  return fallback;
}

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;

      try {
        return JSON.parse(raw) as T;
      } catch {
        // Backward/dirty data: try to coerce, then rewrite as clean JSON.
        const coerced = coerceFromRaw<T>(raw, initialValue);
        try {
          window.localStorage.setItem(key, JSON.stringify(coerced));
        } catch {}
        console.warn(
          `Repaired malformed localStorage key "${key}". Old value: ${raw}`
        );
        return coerced;
      }
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
