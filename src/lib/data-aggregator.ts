

// src/lib/data-aggregator.ts

import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
  isWithinInterval,
  subDays,
} from 'date-fns';
import type { Entry, BillCategory } from './types';
import { parseDateInTimezone } from './time';

export type Granularity = 'week' | 'month' | 'year';

export type AggregatedDataPoint = {
  date: string; // The start date of the period (e.g., 'YYYY-MM-DD')
  income: number;
  expenses: number;
  net: number;
  endOfPeriodBalance: number;
  [key: `category_${string}`]: number; // For category trends
  recurring: number; // For recurring vs variable
  variable: number;  // For recurring vs variable
};

const getIntervalFunctions = (granularity: Granularity) => {
  switch (granularity) {
    case 'week':
      return {
        start: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), // Monday
        end: (date: Date) => endOfWeek(date, { weekStartsOn: 1 }),
        each: (interval: {start: Date, end: Date}) => eachWeekOfInterval(interval, { weekStartsOn: 1 }),
        format: 'yyyy-MM-dd',
      };
    case 'month':
      return {
        start: startOfMonth,
        end: endOfMonth,
        each: eachMonthOfInterval,
        format: 'yyyy-MM',
      };
    case 'year':
      return {
        start: startOfYear,
        end: endOfYear,
        each: eachYearOfInterval,
        format: 'yyyy',
      };
  }
};

export const aggregateData = (
  entries: Entry[],
  dateRange: { start: Date; end: Date },
  granularity: Granularity,
  timezone: string,
  topCategories: BillCategory[] = []
): AggregatedDataPoint[] => {
  if (entries.length === 0) return [];

  const { start, end, each, format: dateFormat } = getIntervalFunctions(granularity);

  const periods = each({
    start: dateRange.start,
    end: dateRange.end,
  });
  
  let runningBalance = 0;
  // Initialize with balance from before the date range
  const entriesBeforeRange = entries.filter(entry => isWithinInterval(parseDateInTimezone(entry.date, timezone), { start: new Date(0), end: dateRange.start }));
  runningBalance = entriesBeforeRange.reduce((acc, entry) => acc + (entry.type === 'income' ? entry.amount : -entry.amount), 0);


  const aggregatedResult = periods.map(periodStart => {
    const periodEnd = end(periodStart);
    const periodEntries = entries.filter(entry =>
      isWithinInterval(parseDateInTimezone(entry.date, timezone), { start: periodStart, end: periodEnd })
    );

    const dataPoint: AggregatedDataPoint = {
      date: format(periodStart, dateFormat),
      income: 0,
      expenses: 0,
      net: 0,
      recurring: 0,
      variable: 0,
      endOfPeriodBalance: 0,
      category_other: 0,
    };
    
    topCategories.forEach(cat => {
        dataPoint[`category_${cat}`] = 0;
    });

    periodEntries.forEach(entry => {
      if (entry.type === 'income') {
        dataPoint.income += entry.amount;
      } else {
        dataPoint.expenses += entry.amount;
        
        const categoryKey = `category_${entry.category}`;
        if (entry.category && topCategories.includes(entry.category)) {
             dataPoint[categoryKey] = (dataPoint[categoryKey] || 0) + entry.amount;
        } else {
             dataPoint.category_other = (dataPoint.category_other || 0) + entry.amount;
        }

        if (entry.recurrence !== 'none') {
            dataPoint.recurring += entry.amount;
        } else {
            dataPoint.variable += entry.amount;
        }
      }
    });

    dataPoint.net = dataPoint.income - dataPoint.expenses;
    runningBalance += dataPoint.net;
    dataPoint.endOfPeriodBalance = runningBalance;
    
    return dataPoint;
  });

  return aggregatedResult;
};

export const getTopCategories = (entries: Entry[], count: number): BillCategory[] => {
    const categoryTotals: { [key in BillCategory]?: number } = {};
    const recentEntries = entries.filter(entry => isWithinInterval(parseDateInTimezone(entry.date, 'UTC'), {start: subDays(new Date(), 90), end: new Date()}));

    recentEntries.forEach(entry => {
        if (entry.type === 'bill' && entry.category) {
            categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.amount;
        }
    });

    return Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b! - a!)
        .slice(0, count)
        .map(([category]) => category as BillCategory);
};
