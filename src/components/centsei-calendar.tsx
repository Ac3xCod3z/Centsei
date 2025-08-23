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
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown, Repeat, Check, Trophy, ChevronDown, Cake, PartyPopper } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";
import type { Entry, WeeklyBalances, SelectedInstance, Birthday, Holiday, BudgetScore, DojoRank, Goal, MasterEntry } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useMedia } from "react-use";
import { getHolidaysForYear } from "@/lib/holidays";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { BudgetScoreWidget } from "./budget-score-widget";
import { DojoJourneyWidget } from "./dojo-journey-widget";
import { Separator } from "./ui/separator";
import { parseDateInTimezone } from "@/lib/time";


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOLD_DURATION_MS = 500; // 500ms for press-and-hold

function getOriginalIdFromInstance(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}

type CentseiCalendarProps = {
    entries: MasterEntry[];
    generatedEntries: Entry[];
    timezone: string;
    openNewEntryDialog: (date: Date) => void;
    setEditingEntry: (entry: Entry | null) => void;
    selectedDate: Date | null;
    setSelectedDate: (date: Date | null) => void;
    setEntryDialogOpen: (isOpen: boolean) => void;
    openDayEntriesDialog: (holidays: Holiday[], birthdays: Birthday[]) => void;
    isReadOnly: boolean;
    weeklyBalances: WeeklyBalances;
    weeklyTotals: {
        income: number;
        bills: number;
        net: number;
        startOfWeekBalance: number;
        status: number;
    },
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
    onInstancePaidToggle: (instanceId: string, isPaid: boolean) => void;
};


export function SidebarContent({ weeklyTotals, selectedDate }: { weeklyTotals: CentseiCalendarProps['weeklyTotals'], selectedDate: Date }) {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Week of {format(startOfWeek(selectedDate), "MMM d")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Starting Balance</span>
                        <span className="font-semibold">{formatCurrency(weeklyTotals.startOfWeekBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                        <span><TrendingUp className="inline-block mr-2 h-4 w-4" />Income</span>
                        <span className="font-semibold">{formatCurrency(weeklyTotals.income)}</span>
                    </div>
                    <div className="flex justify-between items-center text-destructive">
                        <span><TrendingDown className="inline-block mr-2 h-4 w-4" />Bills</span>
                        <span className="font-semibold">{formatCurrency(weeklyTotals.bills)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t">
                        <span>Weekly Status</span>
                        <span className={cn("font-bold", weeklyTotals.status > 0 ? "text-emerald-600" : weeklyTotals.status < 0 ? "text-destructive" : "")}>
                            {weeklyTotals.status >= 0 ? '+' : ''}{formatCurrency(weeklyTotals.status)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                        <span>End of Week</span>
                        <span>{formatCurrency(weeklyTotals.net)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function CentseiCalendar({
    entries,
    generatedEntries,
    timezone,
    openNewEntryDialog,
    setEditingEntry,
    selectedDate,
    setSelectedDate,
    setEntryDialogOpen,
    openDayEntriesDialog,
    isReadOnly,
    weeklyBalances,
    weeklyTotals,
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
    onInstancePaidToggle,
}: CentseiCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [years, setYears] = useState<number[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const isMobile = useMedia("(max-width: 1024px)", false);

  const [draggedEntry, setDraggedEntry] = useState<Entry | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);


  useEffect(() => {
    const currentYear = getYear(new Date());
    setYears(Array.from({ length: 21 }, (_, i) => currentYear - 10 + i));
  }, []);

  const handleDayInteraction = useCallback((day: Date) => {
    if (isReadOnly) return;
    
    const dayEntries = generatedEntries.filter(e => isSameDay(parseDateInTimezone(e.date, timezone), day));
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
  }, [isReadOnly, generatedEntries, birthdays, timezone, openDayEntriesDialog]);


  const handlePointerDown = useCallback((e: React.PointerEvent, day: Date) => {
    if (isReadOnly) return;
    setSelectedDate(day);
    pointerDownRef.current = { x: e.clientX, y: e.clientY };

    // For both mobile and desktop, a long-press will open the dialog if there's content.
    holdTimeoutRef.current = setTimeout(() => {
        handleDayInteraction(day);
        holdTimeoutRef.current = null;
        pointerDownRef.current = null;
    }, HOLD_DURATION_MS);
  }, [isReadOnly, setSelectedDate, handleDayInteraction]);

  const handlePointerUp = useCallback((day: Date) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    // On desktop (not mobile), a simple click should trigger the dialog immediately if content exists.
    if (!isMobile) {
        handleDayInteraction(day);
    }
  }, [isMobile, handleDayInteraction]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerDownRef.current || !holdTimeoutRef.current) return;
    
    const dx = Math.abs(e.clientX - pointerDownRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownRef.current.y);
    
    // If the pointer moves more than a few pixels, it's a scroll, not a long press.
    if (dx > 5 || dy > 5) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      pointerDownRef.current = null;
    }
  }, []);
  
  const handleEditClick = useCallback((entry: Entry) => {
    if(isReadOnly) return;
    // We pass the full instance data, which includes any overrides.
    setEditingEntry(entry);
    setEntryDialogOpen(true);
  }, [isReadOnly, setEditingEntry, setEntryDialogOpen]);

  const onSelectInstances = useCallback((instance: SelectedInstance, checked: boolean) => {
    setSelectedInstances(prev => 
        checked 
            ? [...prev, instance] 
            : prev.filter(i => i.instanceId !== instance.instanceId)
    );
  }, [setSelectedInstances]);

  const isInstanceSelected = useCallback((instanceId: string) => {
    return selectedInstances.some(i => i.instanceId === instanceId);
  }, [selectedInstances]);
  
  const handleDragStart = useCallback((entry: Entry) => {
      if(isReadOnly) return;
      setDraggedEntry(entry);
  }, [isReadOnly]);
  
  const handleDragEnd = useCallback(() => {
      setDraggedEntry(null);
      setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    if(draggedEntry) {
        setDragOverDate(date);
    }
  }, [draggedEntry]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    if(draggedEntry && onMoveRequest) {
        onMoveRequest(draggedEntry, date);
    }
    handleDragEnd();
  }, [draggedEntry, onMoveRequest, handleDragEnd]);


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
                <Button variant={isSelectionMode ? "destructive" : "outline"} size="sm" onClick={toggleSelectionMode}>
                    {isSelectionMode ? `Clear (${selectedInstances.length})` : 'Select'}
                </Button>
                 {isSelectionMode && (
                    <Button variant="destructive" size="sm" onClick={onBulkDelete} disabled={selectedInstances.length === 0}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                 )}
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
            const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
            const isDraggingOver = dragOverDate === dateKey && !!draggedEntry;

            return (
              <div
                key={dateKey}
                className={cn(
                  "h-32 sm:h-36 md:h-40 lg:h-48 xl:h-56 border rounded-lg p-2 flex flex-col transition-colors duration-200 group relative",
                  !isCurrentMonthDay && "bg-muted/50 text-muted-foreground",
                  isSelectedDay && "bg-primary/10 border-primary/50",
                  isCurrentDay && !isSelectedDay && "border-primary",
                  isDraggingOver && "bg-primary/20 ring-2 ring-primary"
                )}
                onPointerDown={(e) => handlePointerDown(e, day)}
                onPointerUp={() => handlePointerUp(day)}
                onPointerMove={handlePointerMove}
                onPointerCancel={() => holdTimeoutRef.current && clearTimeout(holdTimeoutRef.current)}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDrop={(e) => handleDrop(e, dateKey)}
              >
                <div className="flex justify-between items-center mb-1">
                  <time dateTime={dateKey} className={cn("font-semibold", isCurrentDay && !isSelectedDay && "text-primary")}>
                    {format(day, "d")}
                  </time>
                  {!isReadOnly && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
                        onClick={(e) => { e.stopPropagation(); openNewEntryDialog(day); }}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                  )}
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
                            entry.isPaid ? 'bg-secondary text-muted-foreground opacity-70' :
                            entry.type === 'bill' ? 'bg-destructive/10' : 'bg-emerald-500/10',
                            draggedEntry?.id === entry.id && 'opacity-50'
                        )}
                        onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                        draggable={!isReadOnly}
                        onDragStart={(e) => {e.stopPropagation(); handleDragStart(entry)}}
                        onDragEnd={handleDragEnd}
                      >
                         <div className="flex items-center gap-1.5 truncate text-card-foreground">
                            {isSelectionMode ? (
                                <Checkbox 
                                    className="mr-1" 
                                    checked={isInstanceSelected(entry.id)}
                                    onCheckedChange={(checked) => onSelectInstances({instanceId: entry.id, masterId: getOriginalIdFromInstance(entry.id), date: entry.date}, !!checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : entry.isPaid ? (
                                <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : entry.type === 'bill' ? (
                                 <Checkbox
                                    className="mr-1"
                                    checked={entry.isPaid}
                                    onCheckedChange={(checked) => {
                                        onInstancePaidToggle(entry.id, !!checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                 <Image 
                                    src={'/income.png'}
                                    alt={entry.type}
                                    width={12}
                                    height={12}
                                    className="flex-shrink-0"
                                />
                            )}
                            <span className={cn("truncate", entry.isPaid && "line-through")}>{entry.name}</span>
                         </div>
                        <span className={cn("text-card-foreground", entry.isPaid && "line-through")}>{formatCurrency(entry.amount)}</span>
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
                weeklyTotals={weeklyTotals} 
                selectedDate={selectedDate || new Date()}
            />
        </aside>
      )}
    </div>
  );
}
