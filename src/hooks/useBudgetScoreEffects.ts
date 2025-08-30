"use client";

import { useEffect, useRef } from "react";
import type { BudgetScore } from "@/lib/types";
import { format } from "date-fns";

export function useBudgetScoreEffects(
  budgetScore: BudgetScore | null | undefined,
  budgetScores: BudgetScore[],
  setBudgetScores: (scores: BudgetScore[] | ((prev: BudgetScore[]) => BudgetScore[])) => void,
  toast: (args: { title?: string; description?: string; variant?: string }) => void
) {
  const previousScoreRef = useRef<number | null>(null);

  useEffect(() => {
    if (!budgetScore) return;

    if (previousScoreRef.current !== null) {
      const scoreChange = budgetScore.score - previousScoreRef.current;
      if (scoreChange >= 2) {
        toast({
          title: "Sensei sees your growth!",
          description: `Your score improved by ${scoreChange} points!`,
        });
      } else if (scoreChange <= -2) {
        toast({
          title: "Beware, young grasshoppa...",
          description: `Your score has fallen by ${Math.abs(scoreChange)} points.`,
          variant: "destructive",
        });
      }
    }
    previousScoreRef.current = budgetScore.score;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const hasScoreForToday = budgetScores.some((s) => s.date === todayStr);

    if (!hasScoreForToday) {
      const newScores = [...budgetScores, budgetScore].slice(-30);
      setBudgetScores(newScores);
    } else {
      const todaysSavedScore = budgetScores.find((s) => s.date === todayStr);
      if (todaysSavedScore && Math.abs(todaysSavedScore.score - budgetScore.score) > 2) {
        setBudgetScores((prevScores) => {
          const updatedScores = prevScores.filter((s) => s.date !== todayStr);
          return [...updatedScores, budgetScore];
        });
      }
    }
  }, [budgetScore, budgetScores, setBudgetScores, toast]);
}

