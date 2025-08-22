

"use client";

import { format } from "date-fns";
import { Plus, Check, PartyPopper, Cake, GripVertical } from "lucide-react";
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
import React, { useState, useRef, useEffect } from "react";

type DayEntriesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  entries: Entry[];
  holidays: Holiday[];
  birthdays: Birthday[];
  onAddEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onReorder: (orderedEntries: Entry[]) => void;
};

export function DayEntriesDialog({
  isOpen,
  onClose,
  date,
  entries,
  holidays,
  birthdays,
  onAddEntry,
  onEditEntry,
  onReorder
}: DayEntriesDialogProps) {
  
  const [orderedEntries, setOrderedEntries] = useState<Entry[]>([]);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        const sorted = [...entries].sort((a, b) => {
             const aHasOrder = a.order !== undefined && a.order !== null;
             const bHasOrder = b.order !== undefined && b.order !== null;

             if (aHasOrder && !bHasOrder) return -1;
             if (!aHasOrder && bHasOrder) return 1;
             if (aHasOrder && bHasOrder) return a.order! - b.order!;

             if (a.type === 'income' && b.type === 'bill') return -1;
             if (a.type === 'bill' && b.type === 'income') return 1;
             return b.amount - a.amount;
        });
        setOrderedEntries(sorted);
    }
  }, [entries, isOpen]);

  const listRef = useRef<HTMLDivElement>(null);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, entryId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entryId);
    setDraggingItem(entryId);
  };
  
  const handleDragEnd = () => {
    setDraggingItem(null);
    listRef.current?.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggingItem) return;
      
      const listContainer = listRef.current;
      if (!listContainer) return;
      
      listContainer.querySelectorAll('.drop-indicator').forEach(el => el.remove());

      const dropTarget = (e.target as HTMLElement).closest('[data-entry-id]');
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator h-1 bg-primary rounded-full my-1';

      if (dropTarget) {
          const rect = dropTarget.getBoundingClientRect();
          const isAfter = e.clientY > rect.top + rect.height / 2;
          if (isAfter) {
            dropTarget.parentNode?.insertBefore(indicator, dropTarget.nextSibling);
          } else {
            dropTarget.parentNode?.insertBefore(indicator, dropTarget);
          }
      } else {
          listContainer.appendChild(indicator);
      }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedItemId = e.dataTransfer.getData('text/plain');
      if (!droppedItemId || !draggingItem) {
          handleDragEnd();
          return;
      }

      const dropTarget = (e.target as HTMLElement).closest('[data-entry-id]');
      let newIndex = orderedEntries.length;

      if(dropTarget) {
          const dropTargetId = dropTarget.getAttribute('data-entry-id');
          const dropTargetIndex = orderedEntries.findIndex(item => item.id === dropTargetId);
          const rect = dropTarget.getBoundingClientRect();
          const isAfter = e.clientY > rect.top + rect.height / 2;
          newIndex = isAfter ? dropTargetIndex + 1 : dropTargetIndex;
      }
      
      const itemToMove = orderedEntries.find(item => item.id === droppedItemId);
      if (!itemToMove) {
          handleDragEnd();
          return;
      }

      const currentList = orderedEntries.filter(item => item.id !== droppedItemId);
      currentList.splice(newIndex, 0, itemToMove);
      
      setOrderedEntries(currentList);
      onReorder(currentList);
      handleDragEnd();
  };

  const hasContent = orderedEntries.length > 0 || holidays.length > 0 || birthdays.length > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
            className="sm:max-w-md" 
            onInteractOutside={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Entries for {format(date, "MMMM d, yyyy")}</DialogTitle>
            <DialogDescription>
              Review all bills, income, and events for the selected day. Drag to reorder.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
              {hasContent ? (
                  <div className="space-y-3" ref={listRef} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
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
                      {orderedEntries.map((entry) => (
                          <div
                              key={entry.id}
                              draggable
                              data-entry-id={entry.id}
                              onDragStart={(e) => handleDragStart(e, entry.id)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg bg-card border group",
                                entry.isPaid && "opacity-60",
                                draggingItem === entry.id ? 'opacity-30' : 'opacity-100'
                              )}
                          >
                              <div className="flex items-center gap-3">
                                   <div className="cursor-grab p-1" onTouchStart={(e) => e.preventDefault()}>
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                   </div>
                                  <div 
                                      className={cn("p-2 rounded-full flex items-center justify-center", 
                                      entry.isPaid ? 'bg-muted-foreground/20' : entry.type === 'bill' ? 'bg-destructive/20' : 'bg-emerald-500/20'
                                  )}
                                    onClick={() => onEditEntry(entry)}
                                  >
                                      {entry.isPaid ? (
                                        <Check className="h-5 w-5 text-muted-foreground" />
                                      ) : entry.type === 'bill' ? (
                                          <Image src="/bills.png" alt="Bill" width={20} height={20} draggable={false} />
                                      ) : (
                                          <Image src="/income.png" alt="Income" width={20} height={20} draggable={false} />
                                      )}
                                  </div>
                                  <div className="flex flex-col cursor-pointer" onClick={() => onEditEntry(entry)}>
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
