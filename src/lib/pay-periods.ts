// src/lib/pay-periods.ts
import {
  addDays,
  compareAsc,
  differenceInCalendarDays,
  isBefore,
  startOfDay,
} from "date-fns";
import type { Entry } from "./types";
import { parseDateInTimezone } from "./utils";

export type PayPeriod = {
  id: string;         // `${startISO}__${endISO}`
  start: Date;        // inclusive
  end: Date;          // exclusive (first day of next pay-run)
  incomes: Entry[];   // all incomes in this run + any bonus incomes inside [start,end)
  expenses: Entry[];  // expenses in [start,end)
  totals: { income: number; expenses: number; net: number };
};

export const normalize = (d: Date | string) =>
  startOfDay(typeof d === "string" ? new Date(d) : d);

/**
 * Build pay periods by first clustering consecutive income days into a single "pay-run".
 * clusterGapDays = 1 groups back-to-back incomes (e.g., 4th & 5th).
 */
export function buildPayPeriods(all: Entry[], clusterGapDays = 1): PayPeriod[] {
  const allIncomes = all
    .filter(e => e.type === "income")
    .map(e => ({ ...e, date: normalize(parseDateInTimezone(e.date, 'UTC')).toISOString() }))
    .sort((a, b) => compareAsc(new Date(a.date), new Date(b.date)));

  if (!allIncomes.length) return [];

  type Run = { start: Date; incomes: Entry[] };
  const runs: Run[] = [];
  let current: Run | null = null;

  for (const inc of allIncomes) {
    const d = normalize(inc.date);
    if (!current) { current = { start: d, incomes: [inc] }; continue; }
    const lastD = normalize(current.incomes[current.incomes.length - 1].date);
    const gap = differenceInCalendarDays(d, lastD);
    if (gap <= clusterGapDays) current.incomes.push(inc);
    else { runs.push(current); current = { start: d, incomes: [inc] }; }
  }
  if (current) runs.push(current);

  const periods: PayPeriod[] = runs.map((run, i) => {
    const start = run.start;
    const end = i < runs.length - 1 ? runs[i + 1].start : addDays(start, 365);
    return {
      id: `${start.toISOString()}__${end.toISOString()}`,
      start, end,
      incomes: [...run.incomes],
      expenses: [],
      totals: { income: 0, expenses: 0, net: 0 },
    };
  });

  const expenses = all
    .filter(e => e.type === "bill")
    .map(e => ({ ...e, date: normalize(parseDateInTimezone(e.date, 'UTC')).toISOString() }));

  const incomeIdsInRuns = new Set(allIncomes.map(i => i.id));
  const bonusIncomes = all
    .filter(e => e.type === "income" && !incomeIdsInRuns.has(e.id))
    .map(e => ({ ...e, date: normalize(parseDateInTimezone(e.date, 'UTC')).toISOString() }));

  const place = (e: Entry, field: "expenses" | "incomes") => {
    const d = normalize(parseDateInTimezone(e.date, 'UTC'));
    for (const p of periods) {
      if (d >= p.start && isBefore(d, p.end)) {
        if (field === 'expenses') p.expenses.push(e);
        if (field === 'incomes') p.incomes.push(e);
        return;
      }
    }
  };

  expenses.forEach(e => place(e, "expenses"));
  bonusIncomes.forEach(i => place(i, "incomes"));

  periods.forEach(p => {
    const income = p.incomes.reduce((s, e) => s + Math.abs(e.amount), 0);
    const exp = p.expenses.reduce((s, e) => s + Math.abs(e.amount), 0);
    p.totals = { income, expenses: exp, net: income - exp };
  });

  return periods;
}

export function findPeriodForDate(periods: PayPeriod[], day: Date): PayPeriod | undefined {
  const d = normalize(day);
  return periods.find(p => d >= p.start && isBefore(d, p.end));
}

export function spentSoFar(period: PayPeriod, day: Date): number {
  const d = normalize(day);
  return period.expenses
    .filter(e => normalize(parseDateInTimezone(e.date, 'UTC')) <= d)
    .reduce((s, e) => s + Math.abs(e.amount), 0);
}
