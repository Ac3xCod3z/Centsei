
// src/lib/budget-score.ts
import { subDays, format, isWithinInterval } from "date-fns";
import type { Entry, BudgetScore, Rank } from "./types";
import { Award, Shield, Gem, Crown, Anchor } from 'lucide-react';
import React from 'react';
import { parseDateInTimezone } from "./time";

const DEBT_CATEGORIES = ["loans", "credit cards"];

const getSenseiCommentary = (score: number): string => {
  if (score >= 90) return "Masterful control! Your financial discipline is legendary.";
  if (score >= 80) return "Excellent! You move like a shadow in the market.";
  if (score >= 70) return "You have trained well. Your focus is strong.";
  if (score >= 60) return "A solid stance, but there is room for improvement.";
  if (score >= 50) return "Your form is adequate, but lacks conviction. More training is needed.";
  if (score >= 40) return "Your spending is swift like the wind... slow it down.";
  if (score >= 30) return "Beware, young grasshoppa... your wallet is out of balance.";
  return "Much to learn, you still have. The path to financial peace is long.";
};

export const getRank = (score: number): Rank => {
  const className = "w-4 h-4";
  if (score >= 90) return { title: "Sensei", icon: React.createElement(Crown, { className }) };
  if (score >= 80) return { title: "Master", icon: React.createElement(Gem, { className }) };
  if (score >= 60) return { title: "Adept", icon: React.createElement(Award, { className }) };
  if (score >= 40) return { title: "Apprentice", icon: React.createElement(Shield, { className }) };
  return { title: "Novice", icon: React.createElement(Anchor, { className }) };
};

export const calculateBudgetScore = (entries: Entry[], timezone: string): BudgetScore => {
  const today = parseDateInTimezone(new Date(), timezone);
  const thirtyDaysAgo = subDays(today, 30);

  const relevantEntries = entries.filter(e => isWithinInterval(parseDateInTimezone(e.date, timezone), { start: thirtyDaysAgo, end: today }));

  const totalIncome = relevantEntries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSpending = relevantEntries
    .filter(e => e.type === 'bill')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const debtPayments = relevantEntries
    .filter(e => e.type === 'bill' && e.category && DEBT_CATEGORIES.includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  if (totalIncome === 0) {
    return {
      score: 0,
      commentary: "No income recorded in the last 30 days. Cannot calculate score.",
      date: format(today, 'yyyy-MM-dd')
    };
  }

  // 1. Spending-to-Income Ratio (40% weight)
  const spendingRatio = totalSpending / totalIncome;
  let spendingScore = 0;
  if (spendingRatio <= 0.5) spendingScore = 100;
  else if (spendingRatio <= 0.7) spendingScore = 75;
  else if (spendingRatio <= 0.9) spendingScore = 50;
  else spendingScore = 25;

  // 2. Savings Rate (35% weight)
  const savings = totalIncome - totalSpending;
  const savingsRate = savings / totalIncome;
  let savingsScore = 0;
  if (savingsRate >= 0.2) savingsScore = 100;
  else if (savingsRate >= 0.1) savingsScore = 75;
  else if (savingsRate >= 0.05) savingsScore = 50;
  else if (savingsRate >= 0) savingsScore = 25;
  else savingsScore = 0; // Negative savings

  // 3. Debt-to-Income Ratio (25% weight)
  const debtRatio = debtPayments / totalIncome;
  let debtScore = 0;
  if (debtRatio <= 0.15) debtScore = 100;
  else if (debtRatio <= 0.25) debtScore = 75;
  else if (debtRatio <= 0.35) debtScore = 50;
  else debtScore = 25;

  const weightedScore = (spendingScore * 0.40) + (savingsScore * 0.35) + (debtScore * 0.25);
  
  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));

  return {
    score: finalScore,
    commentary: getSenseiCommentary(finalScore),
    date: format(today, 'yyyy-MM-dd'),
  };
};
