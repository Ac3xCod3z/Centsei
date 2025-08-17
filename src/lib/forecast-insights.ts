// src/lib/forecast-insights.ts

import { format, add, isWithinInterval, startOfMonth, parseISO } from 'date-fns';
import type { Entry, Goal } from './types';
import { formatCurrency } from './utils';

type Insight = {
  type: 'spike' | 'risk' | 'ontrack';
  title: string;
  description: string;
  details: string; // for unique keying
};

export const getForecastInsights = (
  allEntries: Entry[],
  goals: Goal[],
): Insight[] => {
  const insights: Insight[] = [];
  if (!goals) {
    goals = [];
  }
  if (allEntries.length === 0) {
    return insights;
  }

  const now = new Date();
  const nextWeekStart = add(now, { days: 1 });
  const nextWeekEnd = add(now, { days: 8 });
  const primaryGoal = goals.length > 0 ? goals[0] : null;

  // 1. Upcoming Spending Spike (7 days out)
  const upcomingSpikeEntries = allEntries.filter(e => {
      const entryDate = parseISO(e.date);
      return isWithinInterval(entryDate, { start: nextWeekStart, end: nextWeekEnd }) && e.type === 'bill';
  });
  
  const totalSpikeAmount = upcomingSpikeEntries.reduce((sum, e) => sum + e.amount, 0);

  if (totalSpikeAmount > 100) { // Example threshold for what constitutes a "spike"
    insights.push({
      type: 'spike',
      title: 'Upcoming Spending',
      description: `Heads up: You have ~${formatCurrency(totalSpikeAmount)} in bills due next week.`,
      details: `spike-${format(nextWeekStart, 'yyyy-MM-dd')}`,
    });
  }
  
  // 2. Savings Risk / On Track for the current month
  const currentMonth = startOfMonth(now);
  const currentMonthEntries = allEntries.filter(e => isWithinInterval(parseISO(e.date), {start: currentMonth, end: add(currentMonth, {months: 1})}));
  
  if (currentMonthEntries.length > 0) {
    const totalIncomeThisMonth = currentMonthEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalBillsThisMonth = currentMonthEntries
        .filter(e => e.type === 'bill')
        .reduce((sum, e) => sum + e.amount, 0);

    if (totalIncomeThisMonth > 0 && primaryGoal) {
        const forecastNet = totalIncomeThisMonth - totalBillsThisMonth;
        
        // Assuming the goal contribution is what's left after expenses
        if (forecastNet < primaryGoal.targetAmount) { // Simplified logic
            const shortfall = primaryGoal.targetAmount - forecastNet;
             if(shortfall > 0){
                insights.push({
                    type: 'risk',
                    title: 'Savings Goal At Risk',
                    description: `This month's forecast may cut into your savings by ~${formatCurrency(shortfall)}.`,
                    details: `risk-${format(currentMonth, 'yyyy-MM')}`,
                });
             } else {
                 insights.push({
                    type: 'ontrack',
                    title: 'On Track!',
                    description: `Great job! You're on pace to meet your savings goal for ${format(currentMonth, 'MMMM')}.`,
                    details: `ontrack-${format(currentMonth, 'yyyy-MM')}`,
                });
             }
        }
    }
  }

  return insights;
};
