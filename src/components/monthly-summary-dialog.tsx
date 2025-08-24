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
