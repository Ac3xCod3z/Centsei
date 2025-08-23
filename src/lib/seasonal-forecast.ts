
// src/lib/seasonal-forecast.ts
import {
  endOfMonth,
  eachMonthOfInterval,
  format,
  isWithinInterval,
  subMonths,
  differenceInMonths,
  setYear,
} from 'date-fns';
import type { Entry, Birthday, Granularity } from './types';
import { getHolidaysForYear } from './holidays';
import { parseDateInTimezone } from './time';

export type ForecastDataPoint = {
  date: string; // Period start date 'YYYY-MM-DD'
  baselineSpend: number;
  forecastSpend: number;
  actualSpend: number;
  event?: string;
};

// This is a simplified placeholder for a more complex learning model
const getHolidayUplift = (holidayName: string, historicalData: any): number => {
  // In a real scenario, you'd look at the user's past spending around this holiday.
  // For now, we'll use a default from the holidays file.
  const defaultHoliday = getHolidaysForYear(new Date().getFullYear()).find(h => h.name === holidayName);
  return defaultHoliday?.uplift || 1.1; // Default to a 10% uplift if not found
};

export const generateSeasonalForecast = (
  entries: Entry[],
  birthdays: Birthday[],
  dateRange: { start: Date; end: Date },
  granularity: Granularity, // For now, we'll focus on 'month'
  timezone: string,
  includeHolidays: boolean,
  includeBirthdays: boolean
): ForecastDataPoint[] => {
  if (entries.length === 0) return [];

  // 1. Calculate Baseline Variable Spend
  const lookbackEnd = subMonths(dateRange.start, 1);
  const lookbackStart = subMonths(lookbackEnd, 3);
  
  const historicalEntries = entries.filter(entry =>
    isWithinInterval(parseDateInTimezone(entry.date, timezone), { start: lookbackStart, end: lookbackEnd })
  );

  const historicalVariableSpend = historicalEntries
    .filter(e => e.type === 'bill' && e.recurrence === 'none')
    .reduce((sum, e) => sum + e.amount, 0);

  const monthsInHistory = Math.max(1, differenceInMonths(lookbackEnd, lookbackStart));
  const monthlyBaseline = monthsInHistory > 0 ? historicalVariableSpend / monthsInHistory : 0;


  // 2. Generate forecast for each period in the date range (monthly for now)
  const periods = eachMonthOfInterval(dateRange);
  const currentYear = new Date().getFullYear();
  const holidays = getHolidaysForYear(currentYear);

  return periods.map(periodStart => {
    const periodEnd = endOfMonth(periodStart);

    let forecastSpend = monthlyBaseline;
    let eventName: string | undefined = undefined;

    // 3. Adjust baseline for holidays in this period
    if (includeHolidays) {
        holidays.forEach(holiday => {
            if (isWithinInterval(holiday.date, { start: periodStart, end: periodEnd })) {
                const upliftMultiplier = getHolidayUplift(holiday.name, {}); // Pass historical data here later
                forecastSpend += monthlyBaseline * (upliftMultiplier - 1);
                eventName = holiday.name; // Simple annotation
            }
        });
    }

    // 4. Adjust for birthdays in this period
    if (includeBirthdays) {
        birthdays.forEach(birthday => {
            if (typeof birthday.date !== 'string' || !birthday.date.includes('-')) return;
            const [month, day] = birthday.date.split('-').map(Number);
            const birthdayDateThisYear = setYear(new Date(0, month - 1, day), periodStart.getFullYear());
            if (isWithinInterval(birthdayDateThisYear, { start: periodStart, end: periodEnd })) {
                forecastSpend += birthday.budget || 50; // Use budget or default to $50
                eventName = eventName ? `${eventName}, ${birthday.name}` : birthday.name;
            }
        });
    }

    // 5. Calculate actual spend for the period
    const actualEntries = entries.filter(entry => 
        entry.type === 'bill' && 
        isWithinInterval(parseDateInTimezone(entry.date, timezone), { start: periodStart, end: periodEnd })
    );
    const actualSpend = actualEntries.reduce((sum, e) => sum + e.amount, 0);

    return {
      date: format(periodStart, 'yyyy-MM-dd'),
      baselineSpend: monthlyBaseline,
      forecastSpend: forecastSpend,
      actualSpend: actualSpend,
      event: eventName,
    };
  });
};
