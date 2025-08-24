Bills Still Blank — Task Checklist

 Sidebar receives real active period data (via Context or props).

 Add debug log in sidebar to verify data:

 idx (activePeriodIndex) ≥ 0

 start, end (ISO)

 expensesCount = p.expenses.length

 expensesTotal = p.totals.expenses

 Build payPeriods from a buffered range of expanded entries (not just the visible month).

 Expand recurrences with ~±3 months around view window.

 Call buildPayPeriods(expanded, 1) on the buffered set.

 Active period index never -1.

 If findIndex returns -1, fallback to previous period or 0.

 Harden kind/date/amount parsing in buildPayPeriods:

 getKind(e) handles "income" | "paycheck" and "expense" | "bill" (case-insensitive); fallback by amount sign.

 getDate(e) normalizes date | dueDate | when to local midnight.

 getAmt(e) uses Math.abs(Number(e.amount)).

 Totals computed from authoritative buckets:

 income = sum(getAmt(i) for p.incomes)

 expenses = sum(getAmt(x) for p.expenses)

 net = income - expenses

 Do not filter out paid items from totals unless explicitly intended.

 Sidebar reads only p.totals:

 totalIncome = p.totals.income

 totalExpenses = p.totals.expenses

 periodNet = p.totals.net

 Remove any re-computation of expenses in the sidebar from day entries or week helpers.

 Console verification after build:

 console.table(payPeriods.map(p => ({ start, end, nInc, nExp, inc, exp, net }))) shows non-zero nExp and matching exp.

 Date boundary rules enforced:

 Normalize to local midnight before comparisons.

 Periods use [start, end) (end exclusive).

 Expense on next run’s start day belongs to next period.

 Smoke tests pass:

 Period with visible bills → sidebar Total Expenses > $0.

 Expense on run start day counted in that period.

 Expense on next run start not counted in previous period.

 Back-to-back incomes (e.g., 4th & 5th) cluster as one period; expenses in between counted.

 No Sun–Sat week helpers (startOfWeek, endOfWeek, eachWeekOfInterval, getWeekOfMonth) used in money math.

✅ Definition of Done

 p.totals.expenses in the active sidebar period is non-zero when bills exist in that window.

 Console table shows matching non-zero nExp and exp for that period.

 Sidebar numbers match buildPayPeriods(); no week-based calculations remain.