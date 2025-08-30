import { format, isBefore, isSameDay, add, getDate, setDate, isSameMonth, differenceInCalendarMonths, lastDayOfMonth, set, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { recurrenceIntervalMonths } from "@/lib/constants";
import { parseDateInTimezone } from "@/lib/utils";
import type { Entry, RolloverPreference, WeeklyBalances } from "@/lib/types";

export const generateRecurringInstances = (
  entry: Entry,
  start: Date,
  end: Date,
  timezone: string
): Entry[] => {
  if (!entry.date) return [];

  const nowInTimezone = toZonedTime(new Date(), timezone);
  const todayInTimezone = set(nowInTimezone, {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });

  const instanceMap = new Map<string, Entry>();

  const createInstance = (date: Date, overridePaidStatus?: boolean): Entry => {
    const dateStr = format(date, "yyyy-MM-dd");
    const exception = entry.exceptions?.[dateStr];

    let isPaid = overridePaidStatus ?? false;

    if (exception && typeof exception.isPaid === "boolean") {
      isPaid = exception.isPaid;
    } else if (entry.recurrence === "none") {
      isPaid = entry.isPaid ?? false;
    } else {
      const isPast = isBefore(date, todayInTimezone);
      const isToday = isSameDay(date, todayInTimezone);
      const isAfter9AM = nowInTimezone.getHours() >= 9;

      if (isPast) {
        isPaid = entry.type === "income" || !!entry.isAutoPay;
      } else if (isToday && isAfter9AM) {
        isPaid = entry.type === "income" || !!entry.isAutoPay;
      }
    }

    const finalInstance: Entry = {
      ...entry,
      date: dateStr,
      id: `${entry.id}-${dateStr}`,
      isPaid,
      order: exception?.order ?? entry.order,
      name: exception?.name ?? entry.name,
      amount: exception?.amount ?? entry.amount,
      ...(exception?.category ? { category: exception.category } : {}),
    };
    return finalInstance;
  };

  const potentialDates: Date[] = [];
  if (entry.recurrence === "none") {
    const entryDate = parseDateInTimezone(entry.date, timezone);
    if (entryDate >= start && entryDate <= end) potentialDates.push(entryDate);
  } else {
    const originalEntryDate = parseDateInTimezone(entry.date, timezone);
    const recurrenceInterval = entry.recurrence
      ? recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths]
      : 0;

    if (recurrenceInterval > 0) {
      let currentDate = originalEntryDate;

      if (isBefore(currentDate, start)) {
        const monthsDiff = differenceInCalendarMonths(start, currentDate);
        const numIntervals = Math.max(0, Math.floor(monthsDiff / recurrenceInterval));
        if (numIntervals > 0) currentDate = add(currentDate, { months: numIntervals * recurrenceInterval });
      }
      while (isBefore(currentDate, start)) currentDate = add(currentDate, { months: recurrenceInterval });

      while (currentDate <= end) {
        const originalDay = getDate(originalEntryDate);
        const lastDayInCurrentMonth = lastDayOfMonth(currentDate).getDate();
        const dayForMonth = Math.min(originalDay, lastDayInCurrentMonth);
        const finalDate = setDate(currentDate, dayForMonth);

        if (finalDate >= start && finalDate <= end && isSameMonth(finalDate, currentDate)) {
          potentialDates.push(finalDate);
        }
        currentDate = add(currentDate, { months: recurrenceInterval });
      }
    } else if (entry.recurrence === "weekly" || entry.recurrence === "bi-weekly") {
      const weeksToAdd = entry.recurrence === "weekly" ? 1 : 2;
      let currentDate = originalEntryDate;
      while (isBefore(currentDate, start)) currentDate = add(currentDate, { weeks: weeksToAdd });
      while (currentDate <= end) {
        if (currentDate >= start) potentialDates.push(currentDate);
        currentDate = add(currentDate, { weeks: weeksToAdd });
      }
    }
  }

  potentialDates.forEach((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (!instanceMap.has(dateStr)) {
      const instance = createInstance(date, entry.exceptions?.[dateStr]?.isPaid);
      instanceMap.set(dateStr, instance);
    }
  });

  if (entry.exceptions) {
    Object.entries(entry.exceptions).forEach(([dateStr, exception]) => {
      // honor explicit removals
      if ((exception as any).movedFrom) {
        instanceMap.delete(dateStr);
        return;
      }

      const exceptionDate = parseDateInTimezone(dateStr, timezone);
      if (exceptionDate >= start && exceptionDate <= end) {
        const existingInstance = instanceMap.get(dateStr);
        if (existingInstance) {
          if (exception.isPaid !== undefined) existingInstance.isPaid = exception.isPaid;
          if (exception.order !== undefined) existingInstance.order = exception.order;
          if (exception.name) existingInstance.name = exception.name;
          if (exception.amount) existingInstance.amount = exception.amount;
          if ((exception as any).category) (existingInstance as any).category = (exception as any).category;
        } else {
          instanceMap.set(dateStr, {
            ...entry,
            date: dateStr,
            id: `${entry.id}-${dateStr}`,
            isPaid: exception.isPaid ?? false,
            order: exception.order ?? entry.order,
            name: exception.name ?? entry.name,
            amount: exception.amount ?? entry.amount,
            ...(exception.category ? { category: exception.category } : {}),
          });
        }
      }

      if (exception.movedTo) {
        const movedToDate = parseDateInTimezone(exception.movedTo, timezone);
        if (movedToDate >= start && movedToDate <= end && !instanceMap.has(exception.movedTo)) {
          instanceMap.set(exception.movedTo, {
            ...entry,
            id: `${entry.id}-${exception.movedTo}`,
            date: exception.movedTo,
            isPaid: exception.isPaid ?? false,
            order: exception.order ?? entry.order,
            name: exception.name ?? entry.name,
            amount: exception.amount ?? entry.amount,
            ...(exception.category ? { category: exception.category } : {}),
          });
        }
      }
    });
  }

  return Array.from(instanceMap.values());
};

export function getOriginalIdFromInstance(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}

export function getInstanceDate(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}-${m[3]}-${m[4]}` : null;
}

export function computeWeeklyBalances(
  allGeneratedEntries: Entry[],
  timezone: string,
  rollover: RolloverPreference
): WeeklyBalances {
  const newWeeklyBalances: WeeklyBalances = {};
  if (allGeneratedEntries.length === 0) return newWeeklyBalances;

  const sortedEntries = [...allGeneratedEntries].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = parseDateInTimezone(sortedEntries[0].date, timezone);
  const lastDate = parseDateInTimezone(sortedEntries[sortedEntries.length - 1].date, timezone);

  const weeks: Date[] = [];
  let cursor = startOfWeek(firstDate);
  const lastWeekEnd = endOfWeek(lastDate);
  while (cursor <= lastWeekEnd) {
    weeks.push(cursor);
    cursor = add(cursor, { weeks: 1 });
  }

  let lastWeekBalance = 0;
  weeks.forEach((weekStart) => {
    const weekEnd = endOfWeek(weekStart);
    const weekKey = format(weekStart, "yyyy-MM-dd");

    const entriesForWeek = allGeneratedEntries.filter((e) => {
      const entryDate = parseDateInTimezone(e.date, timezone);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    const income = entriesForWeek
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const bills = entriesForWeek
      .filter((e) => e.type === "bill")
      .reduce((sum, e) => sum + e.amount, 0);

    let currentWeekStartBalance = lastWeekBalance;
    if (rollover === "reset") {
      // Current implementation retains the same behavior as before
      // Placeholder for potential reset logic if added in the future
    }

    const endOfWeekBalance = currentWeekStartBalance + income - bills;
    newWeeklyBalances[weekKey] = { start: currentWeekStartBalance, end: endOfWeekBalance };
    lastWeekBalance = endOfWeekBalance;
  });

  return newWeeklyBalances;
}

