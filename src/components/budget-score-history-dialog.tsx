
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BudgetScore } from "@/lib/types";
import { format } from "date-fns";

interface BudgetScoreHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    history: BudgetScore[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg">
        <p className="label font-semibold">{`${format(new Date(label), "MMM d, yyyy")}`}</p>
        <p className="intro text-primary">{`Score : ${payload[0].value}`}</p>
        <p className="desc text-xs text-muted-foreground">{payload[0].payload.commentary}</p>
      </div>
    );
  }

  return null;
};

export function BudgetScoreHistoryDialog({ isOpen, onClose, history }: BudgetScoreHistoryDialogProps) {
    
    const chartData = history.map(item => ({
        date: item.date,
        score: item.score,
        commentary: item.commentary
    }));
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Your Training Progress</DialogTitle>
                    <DialogDescription>
                        Track your Budget Health Score over the last 30 days. Consistency is the key to mastery.
                    </DialogDescription>
                </DialogHeader>
                <div className="h-72 w-full pt-4">
                   {chartData.length > 1 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(dateStr) => format(new Date(dateStr), 'MMM d')}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                             />
                            <YAxis 
                                domain={[0, 100]}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                                activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                   ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Not enough data to display history. Keep tracking your budget!
                     </div>
                   )}
                </div>
                 <DialogFooter>
                    <Button onClick={onClose} className="w-full">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
