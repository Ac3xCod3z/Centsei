
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { TrendingUp, Info } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import type { BudgetScore, Rank } from '@/lib/types';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getRank } from '@/lib/budget-score';


interface BudgetScoreWidgetProps {
  score: BudgetScore;
  onInfoClick: () => void;
  onHistoryClick: () => void;
}

const getScoreColor = (scoreValue: number) => {
  if (scoreValue >= 75) return 'hsl(var(--primary))'; // Green
  if (scoreValue >= 50) return 'hsl(var(--accent))'; // Yellow
  return 'hsl(var(--destructive))'; // Red
};

export const BudgetScoreWidget: React.FC<BudgetScoreWidgetProps> = ({ score, onInfoClick, onHistoryClick }) => {
  const scoreColor = getScoreColor(score.score);
  const rank = getRank(score.score);
  
  const chartData = [
    { name: 'Score', value: score.score, color: scoreColor },
    { name: 'Remaining', value: 100 - score.score, color: 'hsl(var(--muted))' },
  ];

  return (
    <Card className="bg-background/50 backdrop-blur-sm relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
              onClick={onInfoClick}
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>What is this score?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sensei's Evaluation
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-1">
            {rank.icon}
            <span>Your Rank: <strong>{rank.title}</strong></span>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="relative mx-auto h-40 w-40">
            <PieChart width={160} height={160}>
                 <Pie
                    data={chartData}
                    cx={75}
                    cy={75}
                    innerRadius={60}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold" style={{ color: scoreColor }}>
                    {score.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
        </div>
        <CardDescription className="text-center mt-4 h-10">{score.commentary}</CardDescription>
      </CardContent>
      <CardFooter>
          <Button variant="outline" className="w-full" onClick={onHistoryClick}>
            View History
          </Button>
      </CardFooter>
    </Card>
  );
};
