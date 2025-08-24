// src/components/centsei-calendar.tsx
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from 'next/image';
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth,
  isSameDay,
  getYear,
  setYear,
  setMonth,
  getMonth,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Check, Cake, PartyPopper, AlertCircle } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency, parseDateInTimezone } from "@/lib/utils";
import type { Entry, SelectedInstance, Birthday, Holiday, BudgetScore, DojoRank, Goal } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useMedia } from "react-use";
import { getHolidaysForYear } from "@/lib/holidays";
import { PayPeriod, findPeriodForDate, spentSoFar } from "@/lib/pay-periods";


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOriginalIdFromInstance(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}

type CentseiCalendarProps = {
    entries: Entry[];
    generatedEntries: Entry[];
    setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
    timezone: string;
    openNewEntryDialog: (date: Date) => void;
    setEditingEntry: (entry: Entry | null) => void;
    setSelectedDate: (date: Date) => void;
    setEntryDialogOpen: (isOpen: boolean) => void;
    openDayEntriesDialog: (holidays: Holiday[], birthdays: Birthday[]) => void;
    isReadOnly: boolean;
    payPeriods: PayPeriod[];
    isSelectionMode: boolean;
    toggleSelectionMode: () => void;
    selectedInstances: SelectedInstance[];
    setSelectedInstances: React.Dispatch<React.SetStateAction<SelectedInstance[]>>;
    onBulkDelete: () => void;
    onMoveRequest: (entry: Entry, newDate: string) => void;
    birthdays: Birthday[];
    budgetScore: BudgetScore | null;
    dojoRank: DojoRank;
    goals: Goal[];
    onScoreInfoClick: () => void;
    onScoreHistoryClick: () => void;
    onDojoInfoClick: () => void;
    activePeriodIndex: number;
    initialBalance: number;
};

type DayCellProps = {
  dayDate: Date;
  entriesForDay: Entry[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onSelect: () => void;
  payPeriods: PayPeriod[];
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelection: (instanceId: string, masterId: string) => void;
  selectedInstances: SelectedInstance[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, day: Date) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, entry: Entry) => void;
};


export function SidebarContent({ periods, activeIndex, initialBalance }: { periods: PayPeriod[], activeIndex: number, initialBalance: number }) {
    if (activeIndex === -1 || !periods[activeIndex]) {
        return (
            <div className="p-4 md:p-6 text-center text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Select a day to see its period summary.</p>
                 <p className="text-xs mt-2">If you have no income entries, add one to create your first pay period.</p>
            </div>
        )
    }

    const period = periods[activeIndex];
    
    // Calculate starting balance for the active period
    const startingBalance = periods.slice(0, activeIndex).reduce((acc, p) => acc + p.totals.net, initialBalance);
    const endBalance = startingBalance + period.totals.net;
    
    return (
        <div className="p-4 md:p-6 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Period: {format(period.start, 'MMM d')} - {format(addDays(period.end, -1), 'MMM d')}
                    </CardTitle>
                </CardHeader>
                 <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                        <span>Starting Balance</span>
                        <span>{formatCurrency(startingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-emerald-600 dark:text-emerald-400">Income</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(period.totals.income)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-destructive">Bills</span>
                        <span className="text-destructive">{formatCurrency(period.totals.expenses)}</span>
                    </div>
                     <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Period Net</span>
                        <span className={cn(period.totals.net < 0 && "text-destructive")}>{formatCurrency(period.totals.net)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>End of Period</span>
                        <span>{formatCurrency(endBalance)}</span>
                    </div>
                 </CardContent>
            </Card>
        </div>
    )
}

function DayCell(props: DayCellProps) {
  const {
    dayDate,
    entriesForDay,
    isCurrentMonth,
    isToday,
    onSelect,
    payPeriods,
    isSelected,
    isSelectionMode,
    toggleSelection,
    selectedInstances,
    onDrop,
    onDragStart,
  } = props;
  
  const period = React.useMemo(
    () => findPeriodForDate(payPeriods, dayDate),
    [payPeriods, dayDate]
  );
  
  return (
    <div
      onDrop={(e) => onDrop(e, dayDate)}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "relative flex h-full min-h-[120px] flex-col rounded-lg border p-2 transition-colors",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isToday && "border-primary",
        isSelected && "bg-day-selected/20 border-day-selected",
        period && !isSelected && "bg-secondary/20"
      )}
      onClick={onSelect}
    >
      <div className={cn("mb-1 text-right text-sm", isToday ? "font-bold text-primary" : "")}>
        {format(dayDate, "d")}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {entriesForDay.map(entry => (
            <div
              key={entry.id}
              draggable
              onDragStart={(e) => onDragStart(e, entry)}
              onClick={(e) => {
                  if(isSelectionMode) {
                      e.stopPropagation();
                      toggleSelection(entry.id, getOriginalIdFromInstance(entry.id));
                  }
              }}
              className={cn(
                "group relative flex cursor-pointer items-center justify-between rounded-md p-1.5 text-xs shadow-sm",
                entry.isPaid ? 'bg-secondary text-muted-foreground' : entry.type === 'bill' ? 'bg-destructive/20' : 'bg-emerald-500/20',
                isSelectionMode && "cursor-pointer",
                selectedInstances.some(inst => inst.instanceId === entry.id) && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                  {entry.isPaid ? (
                    <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : entry.type === 'bill' ? (
                      <Image src="/bills.png" alt="Bill" width={16} height={16} draggable={false} className="shrink-0" />
                  ) : (
                      <Image src="/income.png" alt="Income" width={16} height={16} draggable={false} className="shrink-0" />
                  )}
                  <span className={cn("truncate", entry.isPaid && "line-through")}>{entry.name}</span>
              </div>
               {isSelectionMode ? (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check className="h-5 w-5 text-white" />
                 </div>
               ) : (
                <span className={cn("font-semibold", entry.isPaid && "line-through")}>
                    {formatCurrency(entry.amount)}
                </span>
               )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}


export function CentseiCalendar(props: CentseiCalendarProps) {
  const {
    entries,
    generatedEntries,
    timezone,
    openNewEntryDialog,
    setEditingEntry,
    setSelectedDate,
    setEntryDialogOpen,
    openDayEntriesDialog,
    isReadOnly,
    payPeriods,
    isSelectionMode,
    toggleSelectionMode,
    selectedInstances,
    setSelectedInstances,
    onBulkDelete,
    onMoveRequest,
    birthdays,
    budgetScore,
    dojoRank,
    goals,
    onScoreInfoClick,
    onScoreHistoryClick,
    onDojoInfoClick,
    setEntries,
    activePeriodIndex,
    initialBalance,
  } = props;
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [localSelectedDate, setLocalSelectedDate] = useState(new Date());
  const [draggingEntry, setDraggingEntry] = useState<Entry | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useMedia("(max-width: 768px)", false);

  const handleDayInteraction = (day: Date) => {
    setLocalSelectedDate(day);
    setSelectedDate(day);

    if (isReadOnly) return;
    
    const dayEntries = generatedEntries.filter(entry => isSameDay(parseDateInTimezone(entry.date, timezone), day));
    const dayHolidays = getHolidaysForYear(getYear(day)).filter(h => isSameDay(h.date, day));
    const dayBirthdays = birthdays.filter(b => {
        if (typeof b.date !== 'string' || !b.date.includes('-')) return false;
        const [bMonth, bDay] = b.date.split('-').map(Number);
        return getMonth(day) + 1 === bMonth && day.getDate() === bDay;
    });

    const hasContent = dayEntries.length > 0 || dayHolidays.length > 0 || dayBirthdays.length > 0;
    
    if (hasContent) {
      openDayEntriesDialog(dayHolidays, dayBirthdays);
    }
  };
  
   const handlePointerDown = (day: Date) => {
    if (!isMobile || isReadOnly) return;

    longPressTimerRef.current = setTimeout(() => {
        handleDayInteraction(day);
    }, 500); // 500ms for long press
  };

  const handlePointerUp = (day: Date) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setLocalSelectedDate(day);
    setSelectedDate(day);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, entry: Entry) => {
      if (isReadOnly) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', entry.id);
      setDraggingEntry(entry);
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
      e.preventDefault();
      if (!draggingEntry || isReadOnly) return;
      
      const newDate = format(day, 'yyyy-MM-dd');
      if (newDate !== draggingEntry.date) {
        onMoveRequest(draggingEntry, newDate);
      }
      setDraggingEntry(null);
  };
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonthDate));
    const end = endOfWeek(endOfMonth(currentMonthDate));
    return eachDayOfInterval({ start, end });
  }, [currentMonthDate]);

  const goToPreviousMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
  const goToNextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));
  const goToToday = () => setCurrentMonthDate(new Date());

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    setCurrentMonthDate(setYear(currentMonthDate, year));
  };
  
  const handleMonthChange = (monthStr: string) => {
    const monthIndex = parseInt(monthStr, 10);
    setCurrentMonthDate(setMonth(currentMonthDate, monthIndex));
  };
  
  const currentYear = getYear(currentMonthDate);
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex flex-1 overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <Button onClick={goToPreviousMonth} variant="outline" size="icon" className="h-9 w-9"><ChevronLeft className="h-5 w-5" /></Button>
                <h2 className="text-xl md:text-2xl font-bold text-center">
                    {format(currentMonthDate, "MMMM yyyy")}
                </h2>
                <Button onClick={goToNextMonth} variant="outline" size="icon" className="h-9 w-9"><ChevronRight className="h-5 w-5" /></Button>
                <Button onClick={goToToday} variant="outline" className="hidden sm:inline-flex">Today</Button>
            </div>
            
            <div className="flex items-center gap-2">
                 {!isReadOnly && (
                    <Button onClick={toggleSelectionMode} variant={isSelectionMode ? "secondary" : "outline"}>
                        {isSelectionMode ? `Done (${selectedInstances.length})` : 'Select'}
                    </Button>
                 )}
                 {isSelectionMode && (
                     <Button variant="destructive" onClick={onBulkDelete} disabled={selectedInstances.length === 0}>Delete</Button>
                 )}
            </div>
        </header>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => <div key={day} className="text-center text-sm font-semibold text-muted-foreground">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 gap-1 flex-1">
          {days.map((day) => {
            const dayEntries = generatedEntries.filter(entry => isSameDay(parseDateInTimezone(entry.date, timezone), day));
            return (
              <DayCell
                key={day.toISOString()}
                dayDate={day}
                entriesForDay={dayEntries}
                isCurrentMonth={isSameMonth(day, currentMonthDate)}
                isToday={isToday(day)}
                isSelected={isSameDay(day, localSelectedDate)}
                onSelect={() => isMobile ? handlePointerUp(day) : handleDayInteraction(day)}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                payPeriods={payPeriods}
                isSelectionMode={isSelectionMode}
                toggleSelection={(instanceId, masterId) => {
                    const date = format(day, 'yyyy-MM-dd');
                    const exists = selectedInstances.some(inst => inst.instanceId === instanceId);
                    if (exists) {
                        setSelectedInstances(prev => prev.filter(inst => inst.instanceId !== instanceId));
                    } else {
                        setSelectedInstances(prev => [...prev, { instanceId, masterId, date }]);
                    }
                }}
                selectedInstances={selectedInstances}
              />
            );
          })}
        </div>
      </main>
      {!isMobile && (
        <aside className="w-[300px] border-l p-4 md:p-6 hidden lg:block">
            <ScrollArea className="h-full">
              <SidebarContent periods={payPeriods} activeIndex={activePeriodIndex} initialBalance={initialBalance} />
            </ScrollArea>
        </aside>
      )}
    </div>
  );
}
