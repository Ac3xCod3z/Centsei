// src/components/monthly-summary-dialog.tsx
"use client";

import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { ScrollArea } from './ui/scroll-area';
import { cn, formatCurrency } from '@/lib/utils';
import type { PayPeriod } from '@/lib/pay-periods';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { cn, formatCurrency } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Entry, WeeklyBalances } from '@/lib/types';
import { parseDateInTimezone } from '@/lib/time';


type MonthlySummary = {
    income: number;
    bills: number;
    net: number;
    startOfMonthBalance: number;
    endOfMonthBalance: number;
}


type MonthlySummaryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  periods: PayPeriod[];
};

export function MonthlySummaryDialog({
  isOpen,
  onClose,
  periods
}: MonthlySummaryDialogProps) {

  if (!isOpen) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>

        <DialogContent className="sm:max-w-2xl p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Pay Period Summary</DialogTitle>
                <DialogDescription>
                    An overview of your finances, grouped by pay periods.
                </DialogDescription>

        <DialogContent className="sm:max-w-xl p-0" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="p-6 pb-4 flex-row items-center justify-between">
              <div className="space-y-1.5">
                <DialogTitle>
                    Monthly Summary
                </DialogTitle>
                 <DialogDescription>
                    A high-level overview of your finances for the month.
                 </DialogDescription>
              </div>
               <Popover open={isMonthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="shrink-0 text-lg font-bold tracking-tight">
                        {format(currentMonth, "MMMM yyyy")}
                        <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <div className="p-4">
                        <Select
                            value={String(getYear(currentMonth))}
                            onValueChange={(year) => setCurrentMonth(setYear(currentMonth, parseInt(year)))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-4 pt-0">
                        {MONTHS.map((month, index) => (
                            <Button
                                key={month}
                                variant={getMonth(currentMonth) === index ? "default" : "ghost"}
                                onClick={() => {
                                    setCurrentMonth(setMonth(currentMonth, index));
                                    setMonthPickerOpen(false);
                                }}
                            >
                                {month}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            </DialogHeader>
            <ScrollArea className="max-h-[60vh] px-6">
                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Income</TableHead>
                                <TableHead className="text-right">Expenses</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead className="text-right"># Bills</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {periods.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">
                                        {format(p.start, 'MMM d')} - {format(p.end, 'MMM d')}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(p.totals.income)}
                                    </TableCell>
                                    <TableCell className="text-right text-destructive">
                                        {formatCurrency(p.totals.expenses)}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-bold", p.totals.net < 0 ? "text-destructive" : "text-foreground")}>
                                        {formatCurrency(p.totals.net)}
                                    </TableCell>
                                    <TableCell className="text-right">{p.expenses.length}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {periods.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            Add income entries to see your pay period summary.
                        </p>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 sm:justify-end">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
