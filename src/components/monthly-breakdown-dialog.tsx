

"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format, isSameMonth } from 'date-fns';
import { type Entry, type BillCategory, BillCategories, CategoryEmojis, CategoryDisplayPreference } from '@/lib/types';
import { formatCurrency, parseDateInTimezone } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import useLocalStorage from '@/hooks/use-local-storage';

type MonthlyBreakdownDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
  currentMonth: Date;
  timezone: string;
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(200 80% 50%)',
  'hsl(40 80% 50%)',
  'hsl(280 80% 50%)',
  'hsl(120 80% 40%)',
  'hsl(320 80% 50%)',
  'hsl(80 80% 50%)',
  'hsl(0 0% 50%)',
];

export function MonthlyBreakdownDialog({
  isOpen,
  onClose,
  entries,
  currentMonth,
  timezone,
}: MonthlyBreakdownDialogProps) {
  const [categoryDisplay] = useLocalStorage<CategoryDisplayPreference>('centseiCategoryDisplay', 'text');

  const breakdownData = useMemo(() => {
    const monthlyBills = entries.filter(entry => {
        if (!entry.date) return false;
        const entryDate = parseDateInTimezone(entry.date, timezone);
        return entry.type === 'bill' && isSameMonth(entryDate, currentMonth);
    });

    const breakdown: Record<BillCategory, { total: number, entries: Entry[] }> = Object.fromEntries(
        BillCategories.map(cat => [cat, { total: 0, entries: [] }])
    ) as Record<BillCategory, { total: number, entries: Entry[] }>;
    
    let total = 0;

    for (const bill of monthlyBills) {
      const category = bill.category || 'other';
      if (!breakdown[category]) {
        breakdown[category] = { total: 0, entries: [] };
      }
      breakdown[category].total += bill.amount;
      breakdown[category].entries.push(bill);
      total += bill.amount;
    }
    
    const sortedBreakdown = Object.entries(breakdown)
        .map(([category, data]) => ({ category: category as BillCategory, ...data}))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total);

    return { breakdown: sortedBreakdown, total };
  }, [entries, currentMonth, timezone]);

  const chartData = useMemo(() => {
    return breakdownData.breakdown.map(({ category, total }) => ({
      name: categoryDisplay === 'emoji' ? CategoryEmojis[category] : category.charAt(0).toUpperCase() + category.slice(1),
      value: total,
      textLabel: category.charAt(0).toUpperCase() + category.slice(1),
    }));
  }, [breakdownData, categoryDisplay]);
  
  const getCategoryLabel = (category: BillCategory) => {
    if (categoryDisplay === 'emoji') {
        return <span className="text-xl">{CategoryEmojis[category]}</span>;
    }
    return <span className="font-medium capitalize">{category}</span>;
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <div className="p-2 bg-background border rounded-lg shadow-lg">
                  <p className="font-bold">{`${data.textLabel}: ${formatCurrency(data.value)}`}</p>
              </div>
          );
      }
      return null;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              Category Breakdown for {format(currentMonth, 'MMMM yyyy')}
            </DialogTitle>
            <DialogDescription>
              A summary of your expenses by category. Click a category to see details.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {chartData.length > 0 ? (
                  <div className="w-full h-[250px] flex items-center justify-center">
                      <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                          <PieChart>
                              <Tooltip content={<CustomTooltip />} />
                              <Pie
                                  data={chartData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={60}
                                  strokeWidth={5}
                              >
                                  {chartData.map((entry, index) => (
                                      <Cell
                                          key={`cell-${index}`}
                                          fill={COLORS[index % COLORS.length]}
                                      />
                                  ))}
                              </Pie>
                          </PieChart>
                      </ChartContainer>
                  </div>
              ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No bills with categories found for this month.
                  </div>
              )}
              
              <Accordion type="single" collapsible className="w-full">
                  {breakdownData.breakdown.length > 0 ? (
                    breakdownData.breakdown.map(({ category, total, entries }) => (
                      <AccordionItem value={category} key={category}>
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex justify-between items-center w-full pr-4">
                                {getCategoryLabel(category)}
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                <TableBody>
                                    {entries.sort((a,b) => a.date.localeCompare(b.date)).map((entry, idx) => (
                                        <TableRow key={`${entry.id}-${idx}`}>
                                            <TableCell>{entry.name}</TableCell>
                                            <TableCell>{format(parseDateInTimezone(entry.date, timezone), 'MMM d')}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))
                  ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No bills with categories found for this month.
                      </div>
                  )}
              </Accordion>
              <div className="border-t mt-4 pt-4 flex justify-between items-center text-lg font-bold">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(breakdownData.total)}</span>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
