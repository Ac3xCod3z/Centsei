

"use client";

import React, { useState, useMemo } from 'react';
import { format, isSameMonth, startOfMonth, startOfWeek, getYear, setYear, getMonth, setMonth } from 'date-fns';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  allEntries: Entry[];
  initialMonth: Date;
  weeklyBalances: WeeklyBalances;
  timezone: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function SummaryCard({ title, amount, icon, description, variant = 'default', className }: { title: string, amount: number, icon?: React.ReactNode, description?: string, variant?: 'default' | 'positive' | 'negative', className?: string }) {
    const amountColor = variant === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : variant === 'negative' ? 'text-destructive' : '';
    return (
        <Card className={cn(className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", amountColor)}>{formatCurrency(amount)}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

export function MonthlySummaryDialog({
  isOpen,
  onClose,
  allEntries,
  initialMonth,
  weeklyBalances,
  timezone
}: MonthlySummaryDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [isMonthPickerOpen, setMonthPickerOpen] = useState(false);
  const years = Array.from({length: 21}, (_, i) => getYear(new Date()) - 10 + i);
  
  React.useEffect(() => {
    if(isOpen) {
      setCurrentMonth(initialMonth);
    }
  }, [isOpen, initialMonth])
  
  const summary = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEntries = allEntries.filter(e => isSameMonth(parseDateInTimezone(e.date, timezone), currentMonth));
      const monthlyIncome = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const monthlyBills = monthEntries.filter(e => e.type === 'bill').reduce((s, e) => s + e.amount, 0);

      const firstWeekOfMonthKey = format(startOfWeek(monthStart), 'yyyy-MM-dd');
      const startOfMonthBalance = weeklyBalances[firstWeekOfMonthKey]?.start || 0;
      
      const endOfMonthBalance = startOfMonthBalance + monthlyIncome - monthlyBills;

      return {
          income: monthlyIncome,
          bills: monthlyBills,
          net: monthlyIncome - monthlyBills,
          startOfMonthBalance: startOfMonthBalance,
          endOfMonthBalance,
      };
  }, [currentMonth, allEntries, weeklyBalances, timezone])


  if (!isOpen) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                <div className="space-y-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <SummaryCard 
                            title="Total Income" 
                            amount={summary.income} 
                            icon={<Image src="/income.png" alt="Income" width={16} height={16} style={{ height: 'auto' }} />} 
                        />
                        <SummaryCard 
                            title="Total Bills" 
                            amount={summary.bills} 
                            icon={<Image src="/bills.png" alt="Bill" width={16} height={16} style={{ height: 'auto' }} />} 
                        />
                        <SummaryCard 
                            title="Rollover" 
                            amount={summary.startOfMonthBalance} 
                            icon={<Repeat />} 
                            description="From previous month"
                        />
                        <SummaryCard 
                            title="Monthly Net" 
                            amount={summary.net} 
                            icon={summary.net >= 0 ? <TrendingUp className="text-emerald-500"/> : <TrendingDown className="text-destructive"/>}
                            description="Income - Bills"
                            variant={summary.net >= 0 ? 'positive' : 'negative'}
                        />
                    </div>

                    <Card className="col-span-1 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">End-of-Month Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-3xl font-bold", summary.endOfMonthBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                                {formatCurrency(summary.endOfMonthBalance)}
                            </div>
                            <p className="text-xs text-muted-foreground">(Rollover + Income) - Bills</p>
                        </CardContent>
                    </Card>
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
