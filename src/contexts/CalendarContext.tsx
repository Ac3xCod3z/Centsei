
"use client";

import React, { createContext, useContext } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';

type CalendarCtx = {
  calendarId: string | null;
  setCalendarId: (id: string | null) => void;
};

const Ctx = createContext<CalendarCtx | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [calendarId, setCalendarId] = useLocalStorage<string | null>('centseiActiveCalendarId', null);
  return <Ctx.Provider value={{ calendarId, setCalendarId }}>{children}</Ctx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}

