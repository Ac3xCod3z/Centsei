
'use client';

import { useEffect, useState } from 'react';

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;

      try {
        return JSON.parse(raw) as T;
      } catch (e) {
        console.warn(`Bad localStorage for ${key}; resetting`, e);
        try { localStorage.removeItem(key); } catch {}
        return initialValue;
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
