
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Trophy, Info } from 'lucide-react';
import type { DojoRank } from '@/lib/types';
import { DojoBelt } from './dojo-belt';
import { Progress } from './ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface DojoJourneyWidgetProps {
  rank: DojoRank;
  onInfoClick: () => void;
}

export const DojoJourneyWidget: React.FC<DojoJourneyWidgetProps> = ({ rank, onInfoClick }) => {
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
            <p>What is the Dojo Journey?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Dojo Journey
        </CardTitle>
         <CardDescription className="-mt-1">
            Your current savings rank is <strong>{rank.name}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DojoBelt rank={rank} />
        <div>
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Progress to Next Rank</span>
                <span>{formatCurrency(rank.balanceToNext)} to go</span>
            </div>
            <Progress value={rank.progress} />
            <p className="text-xs text-muted-foreground text-center mt-2">{rank.nextRankName}</p>
        </div>
      </CardContent>
    </Card>
  );
};
