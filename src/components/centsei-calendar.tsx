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
import { findPeriodForDate, PayPeriod, spentSoFar } from "@/lib/pay-periods";


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOriginalIdFromInstance(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}

type CentseiCalendarProps = {
    entries: Entry[];
    generatedEntries: Entry[];
    setEntries: (value: Entry[] | ((val: Entry[]) => Entry[])) => void;
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

function computeStartingBalance(
    periods: PayPeriod[],
    activeIndex: number,
    initialBalance: number = 0
  ): number {
    let bal = initialBalance;
    for (let i = 0; i < activeIndex; i++) {
      bal += periods[i].totals.net;
    }
    return bal;
  }

export function SidebarContent({ periods, activeIndex, initialBalance }: { periods: PayPeriod[], activeIndex: number, initialBalance: number }) {
    
    const period = periods[activeIndex];
    
    if (!period) {
        return (
             <div className="p-4 md:p-6 space-y-6 text-center text-muted-foreground">
                <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                <p className="font-semibold">No Active Pay Period</p>
                <p className="text-sm">Add an income entry to start tracking your first pay period.</p>
            </div>
        );
    }
    
    const startingBalance = computeStartingBalance(periods, activeIndex, initialBalance);
    const endBalance = startingBalance + period.totals.net;


    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Period: {format(period.start, "MMM d")} - {format(addDays(period.end, -1), "MMM d")}</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span>Starting Balance</span>
                        <span className="font-medium">{formatCurrency(startingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                        <span>Total Income</span>
                        <span className="font-semibold">{formatCurrency(period.totals.income)}</span>
                    </div>
                    <div className="flex justify-between items-center text-destructive">
                        <span>Total Expenses</span>
                        <span className="font-semibold">{formatCurrency(period.totals.expenses)}</span>
                    </div>
                     <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                        <span>Period Net</span>
                        <span className={cn(period.totals.net < 0 && "text-destructive")}>{formatCurrency(period.totals.net)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                        <span>End of Period</span>
                        <span className="font-semibold">{formatCurrency(endBalance)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function CentseiCalendar({
    entries,
    generatedEntries,
    setEntries,
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
    activePeriodIndex,
    initialBalance
}: CentseiCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localSelectedDate, setLocalSelectedDate] = useState(new Date());
  const [years, setYears] = useState<number[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const isMobile = useMedia("(max-width: 1024px)", false);

  const [draggedEntry, setDraggedEntry] = useState<Entry | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    const currentYear = getYear(new Date());
    setYears(Array.from({ length: 21 }, (_, i) => currentYear - 10 + i));
  }, []);

  const handleDayInteraction = useCallback((day: Date, isLongPress: boolean) => {
    setLocalSelectedDate(day);
    setSelectedDate(day);

    const dayHasContent = 
      generatedEntries.some(e => isSameDay(parseDateInTimezone(e.date, timezone), day)) ||
      getHolidaysForYear(getYear(day)).some(h => isSameDay(h.date, day)) ||
      birthdays.some(b => {
        if (typeof b.date !== 'string' || !b.date.includes('-')) return false;
        const [bMonth, bDay] = b.date.split('-').map(Number);
        return getMonth(day) + 1 === bMonth && day.getDate() === bDay;
      });

    const openDialog = () => {
        const dayHolidays = getHolidaysForYear(getYear(day)).filter(h => isSameDay(h.date, day));
        const dayBirthdays = birthdays.filter(b => {
             if (typeof b.date !== 'string' || !b.date.includes('-')) return false;
             const [bMonth, bDay] = b.date.split('-').map(Number);
             return getMonth(day) + 1 === bMonth && day.getDate() === bDay;
        });
        openDayEntriesDialog(dayHolidays, dayBirthdays);
    }
    
    if (isMobile) {
        if (isLongPress && dayHasContent) {
            openDialog();
        }
    } else { // Desktop
        if (dayHasContent) {
            openDialog();
        }
    }
  }, [generatedEntries, birthdays, isMobile, openDayEntriesDialog, setSelectedDate, timezone]);

  const handlePointerDown = (day: Date) => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
      handleDayInteraction(day, true);
      longPressTimeout.current = null; 
    }, 500); // 500ms for long press
  };

  const handlePointerUp = (day: Date) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
      handleDayInteraction(day, false);
    }
  };
  
  const handleEditClick = (entry: Entry) => {
    if(isReadOnly) return;
    const originalEntryId = getOriginalIdFromInstance(entry.id);
    const originalEntry = entries.find(e => e.id === originalEntryId) || entry;
    const instanceWithDate = { ...originalEntry, date: entry.date, id: entry.id };
    setEditingEntry(instanceWithDate);
    setEntryDialogOpen(true);
  }

  const handleInstanceSelection = (instance: SelectedInstance, checked: boolean) => {
    setSelectedInstances(prev => 
        checked 
            ? [...prev, instance] 
            : prev.filter(i => i.instanceId !== instance.instanceId)
    );
  };

  const isInstanceSelected = (instanceId: string) => {
    return selectedInstances.some(i => i.instanceId === instanceId);
  }
  
  const handleDragStart = (entry: Entry) => {
      if(isReadOnly) return;
      setDraggedEntry(entry);
  }
  
  const handleDragEnd = () => {
      setDraggedEntry(null);
      setDragOverDate(null);
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    if(draggedEntry) {
        setDragOverDate(date);
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    if(draggedEntry && onMoveRequest) {
        onMoveRequest(draggedEntry, date);
    }
    handleDragEnd();
  }


  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }), [currentDate]);
  
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    generatedEntries.forEach(entry => {
      const dateKey = entry.date;
      const dayEntries = map.get(dateKey) || [];
      dayEntries.push(entry);
      map.set(dateKey, dayEntries);
    });
    // Sort entries within each day
    map.forEach((dayEntries, dateKey) => {
      dayEntries.sort((a,b) => (a.order ?? 99) - (b.order ?? 99));
      map.set(dateKey, dayEntries);
    });
    return map;
  }, [generatedEntries]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    const year = getYear(currentDate);
    const holidays = [...getHolidaysForYear(year), ...getHolidaysForYear(year - 1), ...getHolidaysForYear(year + 1)];
    holidays.forEach(h => {
        const dateKey = format(h.date, 'yyyy-MM-dd');
        const dayHolidays = map.get(dateKey) || [];
        dayHolidays.push(h);
        map.set(dateKey, dayHolidays);
    });
    return map;
  }, [currentDate]);

  const birthdaysByDate = useMemo(() => {
      const map = new Map<string, Birthday[]>();
      birthdays.forEach(b => {
          if (typeof b.date !== 'string' || !b.date.includes('-')) return;
          const [month, day] = b.date.split('-').map(Number);
          const dateKey = `${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayBirthdays = map.get(dateKey) || [];
          dayBirthdays.push(b);
          map.set(dateKey, dayBirthdays);
      });
      return map;
  }, [birthdays]);


  return (
    <div className="flex flex-1 overflow-hidden" ref={calendarRef} onContextMenu={(e) => e.preventDefault()}>
      <main className="flex-1 overflow-y-auto p-1 sm:p-2 md:p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[150px]">
                      {format(currentDate, "MMMM yyyy")}
                    </Button>
                </PopoverTrigger>
                 <PopoverContent className="w-auto p-0">
                    <div className="p-2">
                         <Select onValueChange={(y) => setCurrentDate(setYear(currentDate, parseInt(y)))} defaultValue={String(getYear(currentDate))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-3 gap-1 p-2">
                        {MONTHS.map((month, i) => (
                             <Button key={month} variant={getMonth(currentDate) === i ? 'default' : 'ghost'} onClick={() => setCurrentDate(setMonth(currentDate, i))}>
                                {month}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
             </Popover>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
             <Button variant="ghost" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
           {!isReadOnly && !isMobile && (
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openNewEntryDialog(currentDate)}>
                   <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>
           )}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center font-semibold text-muted-foreground text-sm pb-2">{day}</div>
          ))}
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate.get(dateKey) || [];
            const dayHolidays = holidaysByDate.get(dateKey) || [];
            const dayBirthdays = birthdaysByDate.get(format(day, 'MM-dd')) || [];
            
            const isCurrentMonthDay = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isDraggingOver = dragOverDate === dateKey && !!draggedEntry;
            const isSelected = isSameDay(day, localSelectedDate);

            return (
              <div
                key={dateKey}
                className={cn(
                  "h-32 sm:h-36 md:h-40 lg:h-48 xl:h-56 border rounded-lg p-2 flex flex-col transition-colors duration-200 group relative",
                  !isCurrentMonthDay && "bg-muted text-muted-foreground",
                  isCurrentDay && "border-primary",
                  isSelected && "bg-primary/10",
                  isDraggingOver && "bg-primary/20 ring-2 ring-primary"
                )}
                onPointerDown={() => handlePointerDown(day)}
                onPointerUp={() => handlePointerUp(day)}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDrop={(e) => handleDrop(e, dateKey)}
              >
                <div className="flex justify-between items-center mb-1">
                  <time dateTime={dateKey} className={cn("font-semibold", isCurrentDay && "text-primary")}>
                    {format(day, "d")}
                  </time>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
                    onClick={(e) => { e.stopPropagation(); openNewEntryDialog(day); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 -mr-2 pr-2">
                  <div className="space-y-1">
                    {dayHolidays.map(h => (
                         <div key={h.name} className="px-2 py-1 bg-purple-500/10 text-purple-700 rounded-md text-xs font-semibold flex items-center gap-1">
                            <PartyPopper className="h-3 w-3" /> {h.name}
                        </div>
                    ))}
                     {dayBirthdays.map(b => (
                         <div key={b.id} className="px-2 py-1 bg-pink-500/10 text-pink-600 rounded-md text-xs font-semibold flex items-center gap-1">
                            <Cake className="h-3 w-3" /> {b.name}
                        </div>
                    ))}
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                            "px-2 py-1 rounded-md text-xs font-semibold flex items-center justify-between cursor-pointer", 
                            entry.isPaid ? 'bg-secondary text-muted-foreground' :
                            entry.type === 'bill' ? 'bg-destructive/10 text-card-foreground' : 'bg-emerald-500/10 text-card-foreground',
                            draggedEntry?.id === entry.id && 'opacity-50'
                        )}
                        onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                        draggable={!isReadOnly}
                        onDragStart={(e) => {e.stopPropagation(); handleDragStart(entry)}}
                        onDragEnd={handleDragEnd}
                      >
                         <div className="flex items-center gap-1.5 truncate">
                            {entry.isPaid ? (
                                <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            ) : (
                                <Image 
                                    src={entry.type === 'bill' ? '/bills.png' : '/income.png'}
                                    alt={entry.type}
                                    width={12}
                                    height={12}
                                    className="mr-1 flex-shrink-0"
                                />
                            )}
                            <span className={cn("truncate", entry.isPaid && "line-through")}>{entry.name}</span>
                         </div>
                        <span className={cn(entry.isPaid && "line-through")}>{formatCurrency(entry.amount)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </main>
      {!isMobile && (
        <aside className="w-1/3 max-w-sm border-l overflow-y-auto hidden lg:block bg-secondary/50">
           <SidebarContent 
                periods={payPeriods} 
                activeIndex={activePeriodIndex}
                initialBalance={initialBalance}
            />
        </aside>
      )}
    </div>
  );
}
