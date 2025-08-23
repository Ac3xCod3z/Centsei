// src/components/dojo-journey-dialog.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DojoJourneyWidget } from './dojo-journey-widget';
import type { DojoRank } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Trophy } from 'lucide-react';

interface DojoJourneyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rank: DojoRank;
  onInfoClick: () => void;
}

export function DojoJourneyDialog({
  isOpen,
  onClose,
  rank,
  onInfoClick,
}: DojoJourneyDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dojo Journey</DialogTitle>
          <DialogDescription>
            Your path to financial mastery, measured by your primary Zen Goal.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {rank.level > 0 ? (
            <DojoJourneyWidget rank={rank} onInfoClick={onInfoClick} />
          ) : (
            <Alert>
              <Trophy className="h-4 w-4" />
              <AlertTitle>Begin Your Journey</AlertTitle>
              <AlertDescription>
                Set a "Zen Goal" to begin your Dojo Journey and earn your first
                belt.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
