"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { isSameDay } from "date-fns";
import { CentseiCalendar } from "./centsei-calendar";
import { parseDateInTimezone } from "@/lib/time";
import type { Entry, Goal, DojoRank } from "@/lib/types";

type Props = {
  isMobile: boolean;
  entries: any[];
  generatedEntries: Entry[];
  timezone: string;
  openNewEntryDialog: (date: Date) => void;
  setEditingEntry: (e: Entry | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
  setEntryDialogOpen: (v: boolean) => void;
  openDayEntriesDialog: (holidays: any[], birthdays: any[]) => void;
  payPeriods: any[];
  isSelectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedInstances: any[];
  setSelectedInstances: (v: any) => void;
  onBulkDelete: () => void;
  onMoveRequest: (entry: Entry, newDate: string) => void;
  birthdays: any[];
  budgetScore: any;
  dojoRank: DojoRank | null;
  goals: Goal[];
  onScoreInfoClick: () => void;
  onScoreHistoryClick: () => void;
  onDojoInfoClick: () => void;
  activePeriodIndex: number;
  initialBalance: number;
  onInstancePaidToggle: (instanceId: string, isPaid: boolean) => void;
};

export function DashboardCalendarArea(props: Props) {
  const {
    isMobile,
    entries,
    generatedEntries,
    timezone,
    openNewEntryDialog,
    setEditingEntry,
    selectedDate,
    setSelectedDate,
    setEntryDialogOpen,
    openDayEntriesDialog,
    payPeriods,
    isSelectionMode,
    setSelectionMode,
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
    activePeriodIndex,
    initialBalance,
    onInstancePaidToggle,
  } = props;

  return (
    <>
      <CentseiCalendar
        entries={entries}
        generatedEntries={generatedEntries}
        timezone={timezone}
        openNewEntryDialog={openNewEntryDialog}
        setEditingEntry={setEditingEntry}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setEntryDialogOpen={setEntryDialogOpen}
        openDayEntriesDialog={(holidays, bdays) => {
          const hasContent =
            holidays.length > 0 ||
            bdays.length > 0 ||
            (selectedDate &&
              generatedEntries.filter((e) => isSameDay(parseDateInTimezone(e.date, timezone), selectedDate)).length > 0);
          if (hasContent) openDayEntriesDialog(holidays, bdays);
        }}
        isReadOnly={false}
        payPeriods={payPeriods}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={() => setSelectionMode(!isSelectionMode)}
        selectedInstances={selectedInstances}
        setSelectedInstances={setSelectedInstances}
        onBulkDelete={onBulkDelete}
        onMoveRequest={onMoveRequest}
        birthdays={birthdays}
        budgetScore={budgetScore}
        dojoRank={dojoRank}
        goals={goals}
        onScoreInfoClick={onScoreInfoClick}
        onScoreHistoryClick={onScoreHistoryClick}
        onDojoInfoClick={onDojoInfoClick}
        activePeriodIndex={activePeriodIndex}
        initialBalance={initialBalance}
        onInstancePaidToggle={onInstancePaidToggle}
      />

      {!isMobile && (
        <Button
          onClick={() => openNewEntryDialog(selectedDate ?? new Date())}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl"
        >
          <Plus className="h-8 w-8" />
          <span className="sr-only">Add new entry</span>
        </Button>
      )}
    </>
  );
}

