

"use client";

import { format } from "date-fns";
import { Plus, Check, PartyPopper, Cake } from "lucide-react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Entry, Holiday, Birthday } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import React from "react";

type DayEntriesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  entries: Entry[];
  holidays: Holiday[];
  birthdays: Birthday[];
  onAddEntry: () => void;
  onEditEntry: (entry: Entry) => void;
};

export function DayEntriesDialog({
  isOpen,
  onClose,
  date,
  entries,
  holidays,
  birthdays,
  onAddEntry,
  onEditEntry
}: DayEntriesDialogProps) {
  
  const sortedEntries = React.useMemo(() => 
    [...entries].sort((a, b) => {
        if (a.type === 'income' && b.type === 'bill') return -1;
        if (a.type === 'bill' && b.type === 'income') return 1;
        return a.name.localeCompare(b.name);
    }), [entries]);
    
  const hasContent = sortedEntries.length > 0 || holidays.length > 0 || birthdays.length > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Entries for {format(date, "MMMM d, yyyy")}</DialogTitle>
            <DialogDescription>
              Review all bills, income, and events for the selected day.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
              {hasContent ? (
                  <div className="space-y-3">
                      {holidays.map(holiday => (
                          <div key={holiday.name} className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <div className="p-2 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                  <PartyPopper className="h-5 w-5" />
                              </div>
                              <span className="font-semibold text-purple-700 dark:text-purple-300">Holiday: {holiday.name}</span>
                          </div>
                      ))}
                      {birthdays.map(bday => (
                          <div key={bday.id} className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                              <div className="p-2 rounded-full flex items-center justify-center bg-pink-500/20 text-pink-500">
                                  <Cake className="h-5 w-5" />
                              </div>
                              <span className="font-semibold text-pink-600 dark:text-pink-400">Birthday: {bday.name}</span>
                          </div>
                      ))}
                      {sortedEntries.map((entry) => (
                          <div
                              key={entry.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg bg-card border cursor-pointer hover:bg-muted/50",
                                entry.isPaid && "opacity-60"
                              )}
                              onClick={() => onEditEntry(entry)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={cn(
                                      "p-2 rounded-full flex items-center justify-center", 
                                      entry.isPaid ? 'bg-muted-foreground/20' : entry.type === 'bill' ? 'bg-destructive/20' : 'bg-emerald-500/20'
                                  )}>
                                      {entry.isPaid ? (
                                        <Check className="h-5 w-5 text-muted-foreground" />
                                      ) : entry.type === 'bill' ? (
                                          <Image src="/bills.png" alt="Bill" width={20} height={20} />
                                      ) : (
                                          <Image src="/income.png" alt="Income" width={20} height={20} />
                                      )}
                                  </div>
                                  <div className="flex flex-col">
                                      <span className={cn("font-semibold", entry.isPaid && "line-through")}>{entry.name}</span>
                                      <span className={cn(
                                          "text-lg font-bold", 
                                          entry.isPaid ? 'text-muted-foreground' : entry.type === 'bill' ? 'text-destructive' : 'text-emerald-600',
                                          entry.isPaid && "line-through"
                                      )}>
                                          {formatCurrency(entry.amount)}
                                      </span>
                                  </div>
                              </div>
                              
                              {entry.recurrence && entry.recurrence !== 'none' && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full capitalize">
                                      {entry.recurrence === '12months' ? 'Annually' : entry.recurrence.replace('months', ' mos')}
                                  </span>
                              )}
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-10 text-muted-foreground">
                      <p>No entries for this day.</p>
                  </div>
              )}
          </ScrollArea>
          <DialogFooter className="sm:justify-between gap-2 flex-col-reverse sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={onAddEntry}>
              <Plus className="mr-2 h-4 w-4" /> Add New Entry
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
