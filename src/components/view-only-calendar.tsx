

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMedia } from "react-use";
import Image from 'next/image';

import type { Entry, RolloverPreference, WeeklyBalances, Birthday, Holiday } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, getDay, startOfWeek, endOfWeek, isSameDay, addMonths } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { parseDateInTimezone } from "@/lib/utils";
import { generateRecurringInstances, computeWeeklyBalances } from "@/lib/entries";

type SharedData = {
  entries: Entry[];
  rolloverPreference: RolloverPreference;
  timezone: string;
  goals: [],
  birthdays: Birthday[],
};

// Recurrence expansion moved to @/lib/entries


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
    const newWeeklyBalances = computeWeeklyBalances(allGeneratedEntries, timezone, rolloverPreference);
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
