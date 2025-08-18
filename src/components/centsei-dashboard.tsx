
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMedia } from "react-use";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  setDoc
} from "firebase/firestore";
import { firestore } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { EntryDialog } from "./entry-dialog";
import { SettingsDialog } from "./settings-dialog";
import { DayEntriesDialog } from "./day-entries-dialog";
import { MonthlyBreakdownDialog } from "./monthly-breakdown-dialog";
import { MonthlySummaryDialog } from "./monthly-summary-dialog";
import { CalculatorDialog } from "./calculator-dialog";
import { GoalsDialog } from "./goals-dialog";
import { BirthdaysDialog } from "./birthdays-dialog";
import { EnsoInsightsDialog } from "./enso-insights-dialog";
import { Settings, Menu, Plus, Trash2, BarChartBig, PieChart, CheckCircle2, Calculator, ChevronDown, TrendingUp, Trophy, Target, AreaChart, Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Entry, RolloverPreference, WeeklyBalances, SelectedInstance, BudgetScore, DojoRank, Goal, Birthday, Holiday, SeasonalEvent } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, getDate, setDate, startOfWeek, endOfWeek, eachWeekOfInterval, add, getDay, isSameDay, addMonths, isSameMonth, differenceInCalendarMonths, lastDayOfMonth, set, getYear, isWithinInterval } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { recurrenceIntervalMonths } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { scheduleNotificationsLocal, cancelAllNotificationsLocal } from "@/lib/notification-manager";
import { useToast } from "@/hooks/use-toast";
import { welcomeMessages } from "@/lib/messages";
import { calculateBudgetScore } from "@/lib/budget-score";
import { BudgetScoreInfoDialog } from "./budget-score-info-dialog";
import { BudgetScoreHistoryDialog } from "./budget-score-history-dialog";
import { getDojoRank } from "@/lib/dojo-journey";
import { DojoJourneyInfoDialog } from "./dojo-journey-info-dialog";
import JSConfetti from 'js-confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { BudgetScoreWidget } from "./budget-score-widget";
import { DojoJourneyWidget } from "./dojo-journey-widget";
import { Separator } from "./ui/separator";
import { getHolidaysForYear } from "@/lib/holidays";
import { getForecastInsights } from "@/lib/forecast-insights";
import SenseiSaysUI from "./sensei-says-ui";
import { useSenseiSays } from "@/lib/sensei/useSenseiSays";
import { useAuth } from './auth-provider';
import { CentseiLoader } from "./centsei-loader";
import useLocalStorage from "@/hooks/use-local-storage";
import { parseDateInTimezone, stripUndefined } from "@/lib/utils";
import { MigrationDialog } from './migration-dialog';
import { isLocalMode } from '@/lib/local-mode';

const generateRecurringInstances = (entry: Entry, start: Date, end: Date, timezone: string): Entry[] => {
  if (!entry.date) return [];

  const nowInTimezone = toZonedTime(new Date(), timezone);
  const todayInTimezone = set(nowInTimezone, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

  const instanceMap = new Map<string, Entry>();

  const createInstance = (date: Date, overridePaidStatus?: boolean): Entry => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = entry.exceptions?.[dateStr];

    let isPaid = overridePaidStatus ?? false;

    if (exception && typeof exception.isPaid === 'boolean') {
      isPaid = exception.isPaid;
    } else if (entry.recurrence === 'none') {
      isPaid = entry.isPaid ?? false;
    } else {
      const isPast = isBefore(date, todayInTimezone);
      const isToday = isSameDay(date, todayInTimezone);
      const isAfter9AM = nowInTimezone.getHours() >= 9;

      if (isPast) {
        isPaid = entry.type === 'income' || !!entry.isAutoPay;
      } else if (isToday && isAfter9AM) {
        isPaid = entry.type === 'income' || !!entry.isAutoPay;
      }
    }

    const finalInstance = {
      ...entry,
      date: dateStr,
      id: `${entry.id}-${dateStr}`,
      isPaid,
      order: exception?.order ?? entry.order,
      name: exception?.name ?? entry.name,
      amount: exception?.amount ?? entry.amount,
      ...(exception?.category ? { category: exception.category } : {}),
    };

    return finalInstance;
  };

  const potentialDates: Date[] = [];
  if (entry.recurrence === 'none') {
    const entryDate = parseDateInTimezone(entry.date, timezone);
    if (entryDate >= start && entryDate <= end) potentialDates.push(entryDate);
  } else {
    const originalEntryDate = parseDateInTimezone(entry.date, timezone);
    const recurrenceInterval = entry.recurrence ? recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths] : 0;

    if (recurrenceInterval > 0) {
      let currentDate = originalEntryDate;

      if (isBefore(currentDate, start)) {
        const monthsDiff = differenceInCalendarMonths(start, currentDate);
        const numIntervals = Math.max(0, Math.floor(monthsDiff / recurrenceInterval));
        if (numIntervals > 0) currentDate = add(currentDate, { months: numIntervals * recurrenceInterval });
      }
      while (isBefore(currentDate, start)) currentDate = add(currentDate, { months: recurrenceInterval });

      while (currentDate <= end) {
        const originalDay = getDate(originalEntryDate);
        const lastDayInCurrentMonth = lastDayOfMonth(currentDate).getDate();
        const dayForMonth = Math.min(originalDay, lastDayInCurrentMonth);
        const finalDate = setDate(currentDate, dayForMonth);

        if (finalDate >= start && finalDate <= end && isSameMonth(finalDate, currentDate)) {
          potentialDates.push(finalDate);
        }
        currentDate = add(currentDate, { months: recurrenceInterval });
      }
    } else if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
      const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
      let currentDate = originalEntryDate;
      while (isBefore(currentDate, start)) currentDate = add(currentDate, { weeks: weeksToAdd });
      while (currentDate <= end) {
        if (currentDate >= start) potentialDates.push(currentDate);
        currentDate = add(currentDate, { weeks: weeksToAdd });
      }
    }
  }

  potentialDates.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!instanceMap.has(dateStr)) {
      const instance = createInstance(date, entry.exceptions?.[dateStr]?.isPaid);
      instanceMap.set(dateStr, instance);
    }
  });

  if (entry.exceptions) {
    Object.entries(entry.exceptions).forEach(([dateStr, exception]) => {
      // honor explicit removals
      if (exception.movedFrom) {
        instanceMap.delete(dateStr);
        return;
      }

      const exceptionDate = parseDateInTimezone(dateStr, timezone);
      if (exceptionDate >= start && exceptionDate <= end) {
        const existingInstance = instanceMap.get(dateStr);
        if (existingInstance) {
          if (exception.isPaid !== undefined) existingInstance.isPaid = exception.isPaid;
          if (exception.order !== undefined) existingInstance.order = exception.order;
          if (exception.name) existingInstance.name = exception.name;
          if (exception.amount) existingInstance.amount = exception.amount;
        } else {
          instanceMap.set(dateStr, {
            ...entry,
            date: dateStr,
            id: `${entry.id}-${dateStr}`,
            isPaid: exception.isPaid ?? false,
            order: exception.order ?? entry.order,
            name: exception.name ?? entry.name,
            amount: exception.amount ?? entry.amount,
            ...(exception.category ? { category: exception.category } : {}),
          });
        }
      }

      if (exception.movedTo) {
        const movedToDate = parseDateInTimezone(exception.movedTo, timezone);
        if (movedToDate >= start && movedToDate <= end && !instanceMap.has(exception.movedTo)) {
           instanceMap.set(exception.movedTo, {
            ...entry,
            id: `${entry.id}-${exception.movedTo}`,
            date: exception.movedTo,
            isPaid: exception.isPaid ?? false,
            order: exception.order ?? entry.order,
            name:   exception.name   ?? entry.name,
            amount: exception.amount ?? entry.amount,
            ...(exception.category ? { category: exception.category } : {})
          });
        }
      }
    });
  }

  return Array.from(instanceMap.values());
};

function getOriginalIdFromInstance(key: string) {
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] : key;
}

function getInstanceDate(key: string) {
  const m = key.match(/^(.*)-(\d{4_PAUSE_RENDERING_FOR_TOOL_CODE_EXECUTION