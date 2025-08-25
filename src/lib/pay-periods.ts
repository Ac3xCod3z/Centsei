// src/lib/pay-periods.ts
import {
  addDays,
  compareAsc,
  differenceInCalendarDays,
  isBefore,
  startOfDay,
} from "date-fns";
import type { Entry } from "./types";
import { parseDateInTimezone } from "./time";

export type PayPeriod = {
  id: string;         // `${startISO}__${endISO}`
  start: Date;        // inclusive
  end: Date;          // exclusive (first day of next pay-run)
  incomes: Entry[];   // all incomes in this run + any bonus incomes inside [start,end)
  expenses: Entry[];  // expenses in [start,end)
  totals: { income: number; expenses: number; net: number };
};

const getKind = (e: any): "income" | "expense" => {
    const t = String(e.type ?? e.kind ?? "").toLowerCase();
    if (t === "income" || t === "paycheck") return "income";
    if (t === "expense" || t === "bill") return "expense";
    return Number(e.amount) < 0 ? "expense" : "income";
};

const getDate = (e: any, timezone: string): Date => {
    return parseDateInTimezone(e.date ?? e.dueDate ?? e.when, timezone);
};

const getAmt = (e: any): number => {
    return Math.abs(Number(e.amount));
};


/**
 * Build pay periods by first clustering consecutive income days into a single "pay-run".
 * clusterGapDays = 1 groups back-to-back incomes (e.g., 4th & 5th).
 */
export function buildPayPeriods(all: Entry[], clusterGapDays = 1, timezone: string): PayPeriod[] {
  const allIncomes = all
    .filter(e => getKind(e) === "income")
    .map(e => ({ ...e, date: getDate(e, timezone).toISOString() }))
    .sort((a, b) => compareAsc(new Date(a.date), new Date(b.date)));

  if (!allIncomes.length) return [];

  type Run = { start: Date; incomes: Entry[] };
  const runs: Run[] = [];
  let current: Run | null = null;

  for (const inc of allIncomes) {
    const d = parseDateInTimezone(inc.date, timezone);
    if (!current) { current = { start: d, incomes: [inc] }; continue; }
    const lastD = parseDateInTimezone(current.incomes[current.incomes.length - 1].date, timezone);
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
    .filter(e => getKind(e) === "expense")
    .map(e => ({ ...e, date: getDate(e, timezone).toISOString() }));

  const incomeIdsInRuns = new Set(allIncomes.map(i => i.id));
  const bonusIncomes = all
    .filter(e => getKind(e) === "income" && !incomeIdsInRuns.has(e.id))
    .map(e => ({ ...e, date: getDate(e, timezone).toISOString() }));

  const place = (e: Entry, field: "expenses" | "incomes") => {
    const d = getDate(e, timezone);
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
    const income = p.incomes.reduce((s, e) => s + getAmt(e), 0);
    const exp = p.expenses.reduce((s, e) => s + getAmt(e), 0);
    p.totals = { income, expenses: exp, net: income - exp };
  });

  return periods;
}

export function findPeriodForDate(periods: PayPeriod[], day: Date, timezone: string): PayPeriod | undefined {
  const d = parseDateInTimezone(day, timezone);
  return periods.find(p => d >= p.start && isBefore(d, p.end));
}

export function spentSoFar(period: PayPeriod, day: Date, timezone: string): number {
  const d = parseDateInTimezone(day, timezone);
  return period.expenses
    .filter(e => getDate(e, timezone) <= d)
    .reduce((s, e) => s + getAmt(e), 0);
}
