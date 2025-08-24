🥋 Centsei Pay-Period Migration Handoff
🎯 Goal

Replace all Sun–Sat weekly money math with pay-period math.

A pay-period = first day of a pay-run, first day of the next run

A pay-run = consecutive income days clustered together (e.g. paid on the 4th & 5th → one run; next run 11th & 12th).

Expenses belong to the period covering their due date.

Bonus incomes inside a period count toward that period.

If no incomes exist, skip pay-period math and show an empty state.

Weekday headers (Sun–Sat) stay visual only.

📐 Rules Recap

Start date inclusive, end date exclusive.

Expense on the same day as income → belongs to that period.

Expense on the next run’s start day → belongs to the next period.

Dates always normalized to local midnight.

Periods can cross months.

Recurrence expansion unchanged; feed into buildPayPeriods.

✅ Migration Checklist

- [x] Add new file `src/lib/pay-periods.ts` (engine with clustering).
- [x] (Optional) Add shim in `src/lib/weeks.ts` re-exporting pay-period functions.
- [x] Remove all startOfWeek, endOfWeek, eachWeekOfInterval, getWeekOfMonth calls for money math.
- [x] In `centsei-dashboard.tsx`: import `buildPayPeriods`.
- [x] Compute `payPeriods` from `generatedEntries`.
- [x] Replace `weeklySummary` with `periodSummary` built from `payPeriods`.
- [x] Pass `payPeriods` + `periodSummary` into `CentseiCalendar` and `MonthlySummaryDialog`.
- [x] In `centsei-calendar.tsx`: add `payPeriods` prop.
- [x] For each day cell, use `findPeriodForDate` + `spentSoFar` to calculate remaining this period.
- [x] Replace all “Remaining this week” UI with “Remaining this period”.
- [x] Remove week index/week bucket logic from calendar cells.
- [x] Keep weekday headers (Sun–Sat) only for display.
- [x] In `monthly-summary-dialog.tsx`: accept `periods: PayPeriod[]`.
- [x] Replace weekly rows with pay-period rows (Start, End, Income, Expenses, Net, # Bills).
- [x] Ignore/remove “Start of week” setting for calculations (okay for headers).
- [x] Default grouping = Pay-period (remove “Week” option if present).
- [x] Edge case: no incomes → return [], show “Add an income…” banner.
- [x] Edge case: back-to-back incomes cluster as one run.
- [x] Edge case: bonus income inside period → counts in current period.
- [x] Edge case: expense on run start day → belongs to that period.
- [x] Edge case: expense on next run start day → belongs to next period.
- [x] Always normalize dates to local midnight.
- [x] Allow pay-periods to cross months; calendar still displays normally.
- [x] Recurrence expansion unchanged.
- [x] Add tests:
    - [x] 4th & 5th incomes = same period
    - [x] 11th & 12th incomes = next period
    - [x] Expense on 11th = new period
    - [x] Bonus on 9th = first period
    - [x] Midnight edge cases handled correctly
- [x] Delete/deprecate old week helpers (getWeeksInMonth, weekRanges, etc.).
- [x] Rename “Weekly remaining” to “Remaining this period”.

🧪 Definition of Done

When all boxes are checked:

- [x] No money math depends on Sun–Sat weeks.
- [x] All summaries, badges, and totals are pay-period based.
- [x] UI labels updated (“Remaining this period”).
- [x] Edge cases covered and tested.
