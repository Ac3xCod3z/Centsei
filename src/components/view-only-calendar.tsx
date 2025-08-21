

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMedia } from "react-use";
import Image from 'next/image';

import type { Entry, RolloverPreference, WeeklyBalances, Birthday, Holiday, BillCategory } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, getDay, add, setDate, getDate, startOfWeek, endOfWeek, eachWeekOfInterval, isSameDay, addMonths, isSameMonth, differenceInCalendarMonths, lastDayOfMonth, set, isWithinInterval, isAfter, max } from "date-fns";
import { recurrenceIntervalMonths } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { parseDateInTimezone } from "@/lib/utils";

type SharedData = {
  entries: Entry[];
  rolloverPreference: RolloverPreference;
  timezone: string;
  goals: [],
  birthdays: Birthday[],
};

const generateRecurringInstances = (entry: Entry, start: Date, end: Date, timezone: string): Entry[] => {
  if (!entry.date) return [];

  const instanceMap = new Map<string, Entry>();
  
  const anchorDate = parseDateInTimezone(entry.date, timezone);
  const floorDate = max([anchorDate, start]);
  
  const recurrenceEndDate = entry.recurrenceEndDate ? parseDateInTimezone(entry.recurrenceEndDate, timezone) : null;

  const createInstance = (date: Date, overridePaidStatus?: boolean): Entry => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = entry.exceptions?.[dateStr];

    let isPaid = overridePaidStatus ?? false;

    if (exception && typeof exception.isPaid === 'boolean') {
      isPaid = exception.isPaid;
    } else if (entry.recurrence === 'none') {
      isPaid = entry.isPaid ?? false;
    } else {
      const isPast = isBefore(date, startOfMonth(new Date()));
      isPaid = isPast ? (entry.type === 'income' || !!entry.isAutoPay) : false;
    }

    return {
      ...entry,
      date: dateStr,
      id: `${entry.id}-${dateStr}`,
      isPaid,
      order: exception?.order ?? entry.order,
      name: exception?.name ?? entry.name,
      amount: exception?.amount ?? entry.amount,
      category: exception?.category ?? entry.category,
      isAutoPay: entry.isAutoPay,
    };
  };
  
  if (entry.recurrence === 'none') {
    if (isWithinInterval(anchorDate, { start, end })) {
      const instance = createInstance(anchorDate, entry.isPaid);
      instanceMap.set(entry.date, instance);
    }
  } else {
    let currentDate = anchorDate;
    
    // Fast-forward to the first relevant date
    if (isBefore(currentDate, floorDate)) {
        if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
            const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
            const diffWeeks = Math.floor((floorDate.getTime() - currentDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const weeksToJump = Math.ceil(diffWeeks / weeksToAdd) * weeksToAdd;
            currentDate = add(currentDate, { weeks: weeksToJump });
        } else {
            const interval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
            if (interval) {
                const diffMonths = differenceInCalendarMonths(floorDate, currentDate);
                const monthsToJump = Math.ceil(diffMonths / interval) * interval;
                currentDate = add(currentDate, { months: monthsToJump });
            }
        }
    }
    
    let occurrenceCount = 0;
    while (isBefore(currentDate, end) || isSameDay(currentDate, end)) {
      if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) break;
      if (entry.recurrenceCount && occurrenceCount >= entry.recurrenceCount) break;

      if (isWithinInterval(currentDate, { start, end })) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const instance = createInstance(currentDate);
        instanceMap.set(dateStr, instance);
      }
      
      occurrenceCount++;
      
      if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
        const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
        currentDate = add(currentDate, { weeks: weeksToAdd });
      } else {
        const recurrenceInterval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
        if (recurrenceInterval) {
          const nextMonthDate = add(anchorDate, { months: recurrenceInterval * occurrenceCount });
          const originalDay = getDate(anchorDate);
          const lastDayInNextMonth = lastDayOfMonth(nextMonthDate).getDate();
          currentDate = setDate(nextMonthDate, Math.min(originalDay, lastDayInNextMonth));
        } else {
          break; 
        }
      }
    }
  }

  // Handle exceptions (moves, deletions, modifications)
  if (entry.exceptions) {
    Object.entries(entry.exceptions).forEach(([dateStr, exception]) => {
      if (!exception) return;

      // If an instance was moved FROM this date, remove it
      if (exception.movedTo) {
        instanceMap.delete(dateStr);
      }
      
      // If an instance was deleted, remove it
      if (exception.movedFrom === 'deleted') {
        instanceMap.delete(dateStr);
        return;
      }

      const exceptionDate = parseDateInTimezone(dateStr, timezone);
      if (isWithinInterval(exceptionDate, { start, end })) {
        const existingInstance = instanceMap.get(dateStr);
        // If it's a modification of an existing instance
        if (existingInstance) {
          if (exception.isPaid !== undefined) existingInstance.isPaid = exception.isPaid;
          if (exception.order !== undefined) existingInstance.order = exception.order;
          if (exception.name) existingInstance.name = exception.name;
          if (exception.amount) existingInstance.amount = exception.amount;
        } 
        // If it was moved TO this date, add it as a new instance
        else if (exception.movedFrom && exception.movedFrom !== 'deleted') {
          instanceMap.set(dateStr, createInstance(exceptionDate, exception.isPaid));
        }
      }
    });
  }

  return Array.from(instanceMap.values());
};


export default function ViewOnlyCalendar() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [weeklyBalances, setWeeklyBalances] = useState<WeeklyBalances>({});

  const isMobile = useMedia("(max-width: 1024px)", false);

  useEffect(() => {
    const encodedData = searchParams.get("data");
    if (encodedData) {
      try {
        const decodedString = atob(decodeURIComponent(encodedData));
        const parsedData = JSON.parse(decodedString);
        if (parsedData && Array.isArray(parsedData.entries) && parsedData.timezone) {
            setData({
                entries: parsedData.entries,
                rolloverPreference: parsedData.rolloverPreference || 'carryover',
                timezone: parsedData.timezone,
                goals: parsedData.goals || [],
                birthdays: parsedData.birthdays || [],
            });
        } else {
            throw new Error("Invalid data structure");
        }
      } catch (e) {
        console.error("Failed to parse shared data:", e);
        setError("The shared link is invalid or corrupted. Please ask for a new link.");
      }
    } else {
        setError("No data provided in the link. Please use a valid share link.");
    }
  }, [searchParams]);

  const allGeneratedEntries = useMemo(() => {
    if (!data) return [];
    
    const { entries, timezone } = data;
    if (entries.length === 0) return [];
    
    const viewStart = startOfMonth(subMonths(new Date(), 12));
    const viewEnd = endOfMonth(addMonths(new Date(), 24));

    return entries.flatMap((e) => generateRecurringInstances(e, viewStart, viewEnd, timezone));
  }, [data]);
  
  useEffect(() => {
    if (!data || allGeneratedEntries.length === 0) {
        setWeeklyBalances({});
        return;
    }

    const { rolloverPreference, timezone } = data;
    const newWeeklyBalances: WeeklyBalances = {};
    const sortedEntries = allGeneratedEntries.sort((a,b) => a.date.localeCompare(b.date));
        
    const firstDate = parseDateInTimezone(sortedEntries[0].date, timezone);
    const lastDate = parseDateInTimezone(sortedEntries[sortedEntries.length - 1].date, timezone);
    
    const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate });
    let lastWeekBalance = 0;

    weeks.forEach(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        const entriesForWeek = allGeneratedEntries.filter(e => {
            const entryDate = parseDateInTimezone(e.date, timezone);
            return entryDate >= weekStart && entryDate <= weekEnd;
        });
        
        const income = entriesForWeek.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const bills = entriesForWeek.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
        
        let currentWeekStartBalance = lastWeekBalance;
        if (rolloverPreference === 'reset' && getDay(weekStart) === startOfWeek(new Date()).getDay() && weekStart.getDate() <= 7) {
        }

        const endOfWeekBalance = currentWeekStartBalance + income - bills;
        newWeeklyBalances[weekKey] = { start: currentWeekStartBalance, end: endOfWeekBalance };
        lastWeekBalance = endOfWeekBalance;
    });
    
    if (JSON.stringify(newWeeklyBalances) !== JSON.stringify(weeklyBalances)) {
        setWeeklyBalances(newWeeklyBalances);
    }
  }, [allGeneratedEntries, data, weeklyBalances]);

  const weeklyTotals = useMemo(() => {
    if (!data) {
      return { income: 0, bills: 0, net: 0, startOfWeekBalance: 0, status: 0 };
    }
    const { timezone } = data;
    const weekStart = startOfWeek(selectedDate);
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    const weekBalanceInfo = weeklyBalances[weekKey];
    const startOfWeekBalance = weekBalanceInfo ? weekBalanceInfo.start : 0;
    const endOfWeekBalance = weekBalanceInfo ? weekBalanceInfo.end : 0;

    const weekEntries = allGeneratedEntries.filter(e => {
        const entryDate = parseDateInTimezone(e.date, timezone);
        return entryDate >= weekStart && entryDate <= endOfWeek(weekStart);
    });

    const weeklyIncome = weekEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const weeklyBills = weekEntries.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);

    return {
        income: weeklyIncome,
        bills: weeklyBills,
        net: endOfWeekBalance,
        startOfWeekBalance: startOfWeekBalance,
        status: weeklyIncome - weeklyBills,
    };
  }, [data, allGeneratedEntries, selectedDate, weeklyBalances]);


  if (error) {
    return (
        <div className="flex items-center justify-center h-screen bg-background p-4">
             <Alert variant="destructive" className="max-w-lg">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Shared Calendar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
    )
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="flex h-20 items-center justify-between border-b px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2">
           <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
        </div>
        {isMobile && (
          <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col">
              <SheetHeader className="p-4 md:p-6 border-b shrink-0">
                <SheetTitle>Summary</SheetTitle>
                <SheetDescription>
                  Weekly summary for {format(selectedDate, "MMM d, yyyy")}.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1">
                  <SidebarContent
                    weeklyTotals={weeklyTotals}
                    selectedDate={selectedDate}
                  />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </header>

      <CentseiCalendar
        entries={data.entries}
        generatedEntries={allGeneratedEntries}
        setEntries={() => {}} // No-op
        timezone={data.timezone}
        openNewEntryDialog={() => {}} // No-op
        setEditingEntry={() => {}} // No-op
        setSelectedDate={setSelectedDate}
        setEntryDialogOpen={() => {}} // No-op for read-only view
        openDayEntriesDialog={(holidays: Holiday[], birthdays: Birthday[]) => {}} // No-op
        isReadOnly={true}
        weeklyBalances={weeklyBalances}
        weeklyTotals={weeklyTotals}
        isSelectionMode={false}
        toggleSelectionMode={() => {}}
        selectedInstances={[]}
        setSelectedInstances={() => {}}
        onBulkDelete={() => {}}
        onMoveRequest={() => {}}
        birthdays={data.birthdays || []}
      />
    </div>
  );
}

    
