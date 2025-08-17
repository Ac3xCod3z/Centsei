
"use client";

import { useState, useEffect, useCallback } from 'react';

// Custom hook for using localStorage that is SSR-safe and syncs between tabs
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch a custom event to notify other instances of this hook on the same page
        window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key, value: valueToStore } }));
      }
    } catch (error) {
      console.log(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.log(`Error parsing storage event value for key “${key}”:`, error);
        }
      }
    };

    const handleCustomEvent = (event: Event) => {
        const { detail } = event as CustomEvent;
        if (detail.key === key) {
            setStoredValue(detail.value);
        }
    }
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener('local-storage-change', handleCustomEvent);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener('local-storage-change', handleCustomEvent);
    };
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
