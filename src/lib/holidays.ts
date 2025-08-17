// src/lib/holidays.ts

import { format, set, add, getDay, previousSunday } from 'date-fns';

type Holiday = {
  name: string;
  date: Date;
  uplift: number; // Default spending uplift multiplier
};

// Calculates the date of Easter for a given year (using the Anonymous Gregorian algorithm)
const getEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Gets the Nth day of a specific month (e.g., 3rd Monday of January)
const getNthDayOfMonth = (year: number, month: number, dayOfWeek: number, n: number): Date => {
  const firstDayOfMonth = set(new Date(), { year, month, date: 1 });
  let day = firstDayOfMonth;
  
  while (getDay(day) !== dayOfWeek) {
    day = add(day, { days: 1 });
  }

  return add(day, { weeks: n - 1 });
};

export const getHolidaysForYear = (year: number): Holiday[] => {
  const holidays: Holiday[] = [];
  const easterDate = getEaster(year);

  // New Year's Day
  holidays.push({ name: "New Year's Day", date: set(new Date(), { year, month: 0, date: 1 }), uplift: 1.2 });

  // Valentine's Day
  holidays.push({ name: "Valentine's Day", date: set(new Date(), { year, month: 1, date: 14 }), uplift: 1.3 });

  // Martin Luther King, Jr. Day (3rd Monday in January)
  holidays.push({ name: "MLK Day", date: getNthDayOfMonth(year, 0, 1, 3), uplift: 1.0 });

  // Presidents' Day (3rd Monday in February)
  holidays.push({ name: "Presidents' Day", date: getNthDayOfMonth(year, 1, 1, 3), uplift: 1.1 });
  
  // Easter Sunday
  holidays.push({ name: "Easter", date: easterDate, uplift: 1.25 });

  // Mother's Day (2nd Sunday in May)
  holidays.push({ name: "Mother's Day", date: getNthDayOfMonth(year, 4, 0, 2), uplift: 1.3 });

  // Memorial Day (Last Monday in May)
  const may31 = set(new Date(), { year, month: 4, date: 31 });
  let memorialDay = may31;
  while(getDay(memorialDay) !== 1) {
      memorialDay = add(memorialDay, { days: -1 });
  }
  holidays.push({ name: "Memorial Day", date: memorialDay, uplift: 1.15 });

  // Father's Day (3rd Sunday in June)
  holidays.push({ name: "Father's Day", date: getNthDayOfMonth(year, 5, 0, 3), uplift: 1.3 });

  // Juneteenth
  holidays.push({ name: "Juneteenth", date: set(new Date(), { year, month: 5, date: 19 }), uplift: 1.0 });

  // Independence Day
  holidays.push({ name: "Independence Day", date: set(new Date(), { year, month: 6, date: 4 }), uplift: 1.2 });

  // Labor Day (1st Monday in September)
  holidays.push({ name: "Labor Day", date: getNthDayOfMonth(year, 8, 1, 1), uplift: 1.1 });

  // Halloween
  holidays.push({ name: "Halloween", date: set(new Date(), { year, month: 9, date: 31 }), uplift: 1.25 });

  // Thanksgiving Day (4th Thursday in November)
  holidays.push({ name: "Thanksgiving", date: getNthDayOfMonth(year, 10, 4, 4), uplift: 1.5 });
  
  // Black Friday (Day after Thanksgiving)
  holidays.push({ name: "Black Friday", date: add(getNthDayOfMonth(year, 10, 4, 4), {days: 1}), uplift: 1.8 });
  
  // Cyber Monday (Monday after Thanksgiving)
  holidays.push({ name: "Cyber Monday", date: add(getNthDayOfMonth(year, 10, 4, 4), {days: 4}), uplift: 1.7 });

  // Christmas Day
  holidays.push({ name: "Winter Holidays", date: set(new Date(), { year, month: 11, date: 25 }), uplift: 2.0 });

  // New Year's Eve
  holidays.push({ name: "New Year's Eve", date: set(new Date(), { year, month: 11, date: 31 }), uplift: 1.4 });

  return holidays;
};
