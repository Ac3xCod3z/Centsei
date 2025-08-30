// src/components/sensei-evaluation-dialog.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BudgetScoreWidget } from './budget-score-widget';
import type { BudgetScore } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { TrendingUp } from 'lucide-react';

interface SenseiEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  budgetScore: BudgetScore | null;
  onInfoClick: () => void;
  onHistoryClick: () => void;
}

export function SenseiEvaluationDialog({
  isOpen,
  onClose,
  budgetScore,
  onInfoClick,
  onHistoryClick,
}: SenseiEvaluationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sensei's Evaluation</DialogTitle>
          <DialogDescription>
            A measure of your financial discipline and progress.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {budgetScore ? (
            <BudgetScoreWidget
              score={budgetScore}
              onInfoClick={onInfoClick}
              onHistoryClick={onHistoryClick}
            />
          ) : (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Not Enough Data</AlertTitle>
              <AlertDescription>
                Your Budget Health Score will appear here once you've added
                some income and expenses.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
