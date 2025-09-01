
// src/components/centsei-dashboard.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMedia } from "react-use";
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
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
import { ensurePersonalCalendar } from '@/lib/calendars';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

import dynamic from 'next/dynamic';
const EntryDialog = dynamic(() => import('./entry-dialog').then(m => m.EntryDialog), { ssr: false });
const SettingsDialog = dynamic(() => import('./settings-dialog').then(m => m.SettingsDialog), { ssr: false });
const DayEntriesDialog = dynamic(() => import('./day-entries-dialog').then(m => m.DayEntriesDialog), { ssr: false });
const MonthlyBreakdownDialog = dynamic(() => import('./monthly-breakdown-dialog').then(m => m.MonthlyBreakdownDialog), { ssr: false });
const MonthlySummaryDialog = dynamic(() => import('./monthly-summary-dialog').then(m => m.MonthlySummaryDialog), { ssr: false });
const CalculatorDialog = dynamic(() => import('./calculator-dialog').then(m => m.CalculatorDialog), { ssr: false });
const GoalsDialog = dynamic(() => import('./goals-dialog').then(m => m.GoalsDialog), { ssr: false });
const BirthdaysDialog = dynamic(() => import('./birthdays-dialog').then(m => m.BirthdaysDialog), { ssr: false });
const EnsoInsightsDialog = dynamic(() => import('./enso-insights-dialog').then(m => m.EnsoInsightsDialog), { ssr: false });
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

import type { Entry, RolloverPreference, SelectedInstance, BudgetScore, DojoRank, Goal, Birthday, Holiday, SeasonalEvent, MasterEntry } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
import { DashboardTopbar } from "./dashboard-topbar";
import { DashboardCalendarArea } from "./dashboard-calendar-area";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, getDate, setDate, startOfWeek, endOfWeek, eachWeekOfInterval, add, getDay, isSameDay, addMonths, isSameMonth, differenceInCalendarMonths, lastDayOfMonth, set, getYear, isWithinInterval, isAfter, max, parseISO } from "date-fns";
import { recurrenceIntervalMonths } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { scheduleNotificationsLocal, cancelAllNotificationsLocal } from "@/lib/notification-manager";
import { useToast } from "@/hooks/use-toast";
import { welcomeMessages } from "@/lib/messages";
import { calculateBudgetScore, getRank } from "@/lib/budget-score";
import { BudgetScoreInfoDialog } from "./budget-score-info-dialog";
import { BudgetScoreHistoryDialog } from "./budget-score-history-dialog";
import { getDojoRank } from "@/lib/dojo-journey";
import { DojoJourneyInfoDialog } from "./dojo-journey-info-dialog";
import JSConfetti from 'js-confetti';
import { getHolidaysForYear } from "@/lib/holidays";
import { getForecastInsights } from "@/lib/forecast-insights";
import SenseiSaysUI from "./sensei-says-ui";
import { useAuth } from './auth-provider';
import { CentseiLoader } from "./centsei-loader";
import useLocalStorage from "@/hooks/use-local-storage";
import { stripUndefined } from "@/lib/utils";
import { useSenseiSays } from "@/lib/sensei/useSenseiSays";
import { useBlockMobileContextMenu } from "@/hooks/use-block-mobile-contextmenu";
import { useBodyNoCalloutToggle } from "@/hooks/use-body-no-callout-toggle";
import { SenseiEvaluationDialog } from "./sensei-evaluation-dialog";
import { DojoJourneyDialog } from "./dojo-journey-dialog";
import { cn } from "@/lib/utils";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { useEntrySeriesActions } from "@/hooks/useEntrySeriesActions";

import { buildPayPeriods } from "@/lib/pay-periods";
import { moveOneTime, moveSeries, moveSingleOccurrence, validateMaster, updateSeries, updateSingleOccurrence, deleteSeries, deleteSingleOccurrence } from "@/lib/move";
import { parseDateInTimezone } from "@/lib/time";
import { startOfDay } from "date-fns";



const generateRecurringInstances = (entry: MasterEntry, start: Date, end: Date, timezone: string): Entry[] => {
  if (!entry.date) return [];

  const instanceMap = new Map<string, Entry>();
  
  const anchorDate = parseDateInTimezone(entry.date, timezone);
  const floorDate = max([anchorDate, startOfDay(start)]);
  
  const recurrenceEndDate = entry.recurrenceEndDate ? parseDateInTimezone(entry.recurrenceEndDate, timezone) : null;

  const createInstance = (date: Date): Entry => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = entry.exceptions?.[dateStr];

    const today = parseDateInTimezone(new Date(), timezone);
    const instanceDate = date; // Already a zoned date object
    const isPastOrToday = !isAfter(instanceDate, today);

    let isPaid = false;
    if (exception?.isPaid !== undefined) {
      isPaid = exception.isPaid;
    } else if (entry.recurrence === 'none') {
      isPaid = entry.isPaid ?? false;
    } else {
      const isAuto = entry.isAutoPay;
      if (isAuto) {
        isPaid = isPastOrToday;
      } else {
        isPaid = false;
      }
    }

    return {
      ...entry,
      date: dateStr,
      id: `${entry.id}-${dateStr}`,
      isPaid,
      order: exception?.order ?? entry.order,
      name: exception?.name ?? entry.name,
      amount: exception?.amount ?? entry.amount,
      category: exception?.category ?? entry.category,
      isAutoPay: entry.isAutoPay,
    };
  };
  
  if (entry.recurrence === 'none') {
    if (isWithinInterval(anchorDate, { start: floorDate, end })) {
      const instance = createInstance(anchorDate);
      instanceMap.set(entry.date, instance);
    }
  } else {
    let currentDate = anchorDate;
    
    // Fast-forward to the first relevant date
    if (isBefore(currentDate, floorDate)) {
        if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
            const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
            while (isBefore(currentDate, floorDate)) {
              currentDate = add(currentDate, { weeks: weeksToAdd });
            }
        } else {
            const interval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
            if (interval) {
               while (isBefore(currentDate, floorDate)) {
                  currentDate = add(currentDate, { months: interval });
               }
            }
        }
    }
    
    let occurrenceCount = 0;
    while (isBefore(currentDate, end) || isSameDay(currentDate, end)) {
      if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) break;
      if (entry.recurrenceCount && occurrenceCount >= entry.recurrenceCount) break;

      if (isWithinInterval(currentDate, { start: floorDate, end })) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const instance = createInstance(currentDate);
        instanceMap.set(dateStr, instance);
      }
      
      occurrenceCount++;
      
      if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
        const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
        currentDate = add(currentDate, { weeks: weeksToAdd });
      } else {
        const recurrenceInterval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
        if (recurrenceInterval) {
          const nextMonthDate = add(anchorDate, { months: recurrenceInterval * occurrenceCount });
          const originalDay = getDate(anchorDate);
          const lastDayInNextMonth = lastDayOfMonth(nextMonthDate).getDate();
          currentDate = setDate(nextMonthDate, Math.min(originalDay, lastDayInNextMonth));
        } else {
          break; 
        }
      }
    }
  }

  if (entry.exceptions) {
    Object.entries(entry.exceptions).forEach(([dateStr, exception]) => {
      if (!exception) return;

      if (exception.movedTo) {
        instanceMap.delete(dateStr);
      }
      
      if (exception.movedFrom === 'deleted') {
        instanceMap.delete(dateStr);
        return;
      }

      const exceptionDate = parseDateInTimezone(dateStr, timezone);
      if (isWithinInterval(exceptionDate, { start: floorDate, end })) {
        const existingInstance = instanceMap.get(dateStr);
        if (existingInstance) {
          if (exception.isPaid !== undefined) existingInstance.isPaid = exception.isPaid;
          if (exception.order !== undefined) existingInstance.order = exception.order;
          if (exception.name) existingInstance.name = exception.name;
          if (exception.amount) existingInstance.amount = exception.amount;
        } 
        else if (exception.movedFrom && exception.movedFrom !== 'deleted') {
          instanceMap.set(dateStr, createInstance(exceptionDate));
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

type SaveRequest = {
  entryData: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string };
  updateAll: boolean;
};

export default function CentseiDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const pathname = usePathname();
  useBlockMobileContextMenu(pathname === "/" || pathname?.startsWith("/view"));
  useBodyNoCalloutToggle();

  const [entries, setEntries] = useState<MasterEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);
  
  const [rolloverPreference, setRolloverPreference] = useLocalStorage<RolloverPreference>('centseiRollover', 'carryover');
  const [timezone, setTimezone] = useLocalStorage<string>('centseiTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage('centseiNotificationsEnabled', false);
  const [budgetScoreHistory, setBudgetScoreHistory] = useLocalStorage<BudgetScore[]>('centseiBudgetScoreHistory', []);
  const [lastWelcomeMessage, setLastWelcomeMessage] = useLocalStorage<{ message: string, date: string } | null>('centseiLastWelcome', null);
  const [initialBalance, setInitialBalance] = useLocalStorage<number>('centseiInitialBalance', 0);

  
  const [isEntryDialogOpen, setEntryDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [isDayEntriesDialogOpen, setDayEntriesDialogOpen] = useState(false);
  const [isMonthlyBreakdownOpen, setMonthlyBreakdownOpen] = useState(false);
  const [isMonthlySummaryOpen, setMonthlySummaryOpen] = useState(false);
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  const [isBirthdaysOpen, setBirthdaysOpen] = useState(false);
  const [isEnsoInsightsOpen, setEnsoInsightsOpen] = useState(false);
  const [isScoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [isScoreHistoryOpen, setScoreHistoryOpen] = useState(false);
  const [isDojoInfoOpen, setDojoInfoOpen] = useState(false);
  const [isSenseiEvalOpen, setSenseiEvalOpen] = useState(false);
  const [isDojoJourneyOpen, setDojoJourneyOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<SelectedInstance[]>([]);

  const [entryToDelete, setEntryToDelete] = useState<{instanceId: string, isSeries: boolean} | null>(null);
  const [moveRequest, setMoveRequest] = useState<{entry: Entry, newDate: string} | null>(null);
  const [updateRequest, setUpdateRequest] = useState<{entry: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string }, isSeries: boolean} | null>(null);

  const { toast } = useToast();
  const isMobile = useMedia("(max-width: 1024px)", false);
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const jsConfettiRef = useRef<JSConfetti | null>(null);
  const settingsLoadedRef = useRef<string | null>(null);

  const senseiSays = useSenseiSays({ user });

  const { position: mobileMenuPosition, fabRef: mobileMenuFabRef, handlers: mobileMenuHandlers, isDragging: isMobileMenuDragging } = useDraggableFab({
    initialPosition: { x: 16, y: 88 }, // Bottom-left default
    onClick: () => setMobileSheetOpen(true),
  });

  // Ensure calendar and load calendar-scoped data
  useEffect(() => {
    if (!user) {
        settingsLoadedRef.current = null; // Reset for potential re-login
        return;
    }
    const unsubscribers: (() => void)[] = [];
    (async () => {
      let calId = activeCalendarId;
      if (!calId) {
        calId = await ensurePersonalCalendar(firestore, user.uid);
        setActiveCalendarId(calId);
      }
      
      const entriesQuery = query(collection(firestore, 'calendars', calId!, 'calendar_entries'));
      unsubscribers.push(onSnapshot(entriesQuery, snapshot => {
          setEntries(snapshot.docs.map(d => ({...d.data(), id: d.id } as MasterEntry)));
      }));

      const goalsQuery = query(collection(firestore, 'calendars', calId!, 'goals'));
      unsubscribers.push(onSnapshot(goalsQuery, snapshot => {
          setGoals(snapshot.docs.map(d => ({...d.data(), id: d.id } as Goal)));
      }));
      
      const birthdaysQuery = query(collection(firestore, 'calendars', calId!, 'birthdays'));
      unsubscribers.push(onSnapshot(birthdaysQuery, snapshot => {
          setBirthdays(snapshot.docs.map(d => ({...d.data(), id: d.id } as Birthday)));
      }));

    })();
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, activeCalendarId]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        jsConfettiRef.current = new JSConfetti();
        gsap.registerPlugin(MotionPathPlugin);
    }
  }, []);

  const allGeneratedEntries = useMemo(() => {
    if (entries.length === 0) return [];
    
    const viewStart = startOfMonth(subMonths(new Date(), 3));
    const viewEnd = endOfMonth(addMonths(new Date(), 3));

    return entries.flatMap((e) => generateRecurringInstances(e, viewStart, viewEnd, timezone));
  }, [entries, timezone]);

  const payPeriods = useMemo(
    () => buildPayPeriods(allGeneratedEntries, 1, timezone),
    [allGeneratedEntries, timezone]
  );
  
  const activePeriodIndex = useMemo(() => {
    const idx = payPeriods.findIndex(p => selectedDate && selectedDate >= p.start && selectedDate < p.end);
    if (idx !== -1) return idx;
    // Fallback: find the period that would have been before this date.
    if (!selectedDate) return -1;
    const prevIdx = payPeriods.findIndex(p => selectedDate >= p.start) -1;
    return Math.max(0, prevIdx);
  }, [payPeriods, selectedDate]);


  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    if (enabled) {
      if (Notification.permission === 'granted') {
        scheduleNotificationsLocal(entries, timezone, toast);
        toast({ title: 'Notifications Enabled', description: 'You will now receive reminders for upcoming bills.' });
      } else if (Notification.permission === 'denied') {
        toast({ title: 'Notifications Blocked', description: 'Please enable notifications in your browser settings.', variant: 'destructive' });
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            scheduleNotificationsLocal(entries, timezone, toast);
            toast({ title: 'Notifications Enabled', description: 'You will now receive reminders for upcoming bills.' });
          } else {
            setNotificationsEnabled(false);
            toast({ title: 'Notifications Not Enabled', description: 'You have not granted permission for notifications.' });
          }
        });
      }
    } else {
      cancelAllNotificationsLocal(toast);
      toast({ title: 'Notifications Disabled', description: 'You will no longer receive bill reminders.' });
    }
  };

  const handleSaveEntry = async (
    entryToSave: Omit<Entry, 'id' | 'date'> & { id?: string; date: Date; originalDate?: string },
    isSeriesUpdate = false
) => {
    if (!activeCalendarId) return;

    const { originalDate, ...data } = entryToSave;
    const masterId = data.id ? getOriginalIdFromInstance(data.id) : undefined;
    const masterEntry = masterId ? entries.find(e => e.id === masterId) : undefined;
    
    if (masterEntry && masterEntry.recurrence !== 'none' && !isSeriesUpdate && !updateRequest) {
        setUpdateRequest({ entry: entryToSave, isSeries: false });
        return;
    }
    
    setUpdateRequest(null); // Clear the request once we proceed

    const saveData = { ...data };
    if (saveData.date) saveData.date = format(saveData.date, 'yyyy-MM-dd');
    if (saveData.recurrenceEndDate) saveData.recurrenceEndDate = format(saveData.recurrenceEndDate as Date, 'yyyy-MM-dd');
    
    if (masterId && masterEntry) {
        let updatedEntry: MasterEntry;
        if (isSeriesUpdate) {
            updatedEntry = updateSeries(masterEntry, saveData);
        } else {
            updatedEntry = updateSingleOccurrence(masterEntry, originalDate || saveData.date, saveData);
        }
        await updateDoc(doc(firestore, 'calendars', activeCalendarId, 'calendar_entries', masterId), stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));

    } else { // New entry
        const newEntryData = { ...saveData, created_at: serverTimestamp(), updated_at: serverTimestamp() };
        await addDoc(collection(firestore, 'calendars', activeCalendarId, 'calendar_entries'), stripUndefined(newEntryData));
    }

    if(notificationsEnabled) scheduleNotificationsLocal(entries, timezone, toast);
    toast({ title: 'Entry Saved', description: `Your ${data.type} has been saved.` });
    setEntryDialogOpen(false);
    setEditingEntry(null);
};


  const handleCopyEntry = (entry: Entry) => {
    if (!selectedDate) return;
    const copy = { ...entry, id: '', date: format(selectedDate, 'yyyy-MM-dd') };
    setEditingEntry(copy as Entry);
    setEntryDialogOpen(true);
  }


  const handleDeleteConfirmation = (instanceId: string) => {
    const masterId = getOriginalIdFromInstance(instanceId);
    const masterEntry = entries.find(e => e.id === masterId);

    if (masterEntry && masterEntry.recurrence !== 'none') {
        setEntryToDelete({ instanceId, isSeries: false });
    } else {
        handleDeleteEntry(instanceId, false); // It's a single entry, delete directly
    }
  }

  const handleDeleteEntry = async (instanceId: string | null, isSeriesDelete: boolean) => {
    if (!instanceId || !activeCalendarId) return;
    const masterId = getOriginalIdFromInstance(instanceId);
    
    const masterDocRef = doc(firestore, 'calendars', activeCalendarId, 'calendar_entries', masterId);
    if (isSeriesDelete) {
        await deleteDoc(masterDocRef);
    } else {
        const masterDoc = await getDoc(masterDocRef);
        if (!masterDoc.exists()) return;
        const masterEntry = masterDoc.data() as Entry;

        if (masterEntry.recurrence === 'none') {
            await deleteDoc(masterDocRef);
        } else {
            const instanceDate = instanceId.substring(masterId.length + 1);
            const exceptions = { ...masterEntry.exceptions };
            exceptions[instanceDate] = { ...exceptions[instanceDate], movedFrom: "deleted" };
            await updateDoc(masterDocRef, { exceptions });
        }
    }
    
    setEntryToDelete(null);
    setDayEntriesDialogOpen(false);
    toast({ title: 'Entry Deleted' });
  };
  
  const handleBulkDelete = async () => {
     if (!activeCalendarId) return;

     const batch = writeBatch(firestore);
     const masterUpdates = new Map<string, any>();
     
     for(const instance of selectedInstances) {
         const masterEntry = entries.find(e => e.id === instance.masterId);
         if(!masterEntry) continue;
         
         if(masterEntry.recurrence === 'none') {
             const docRef = doc(firestore, 'calendars', activeCalendarId, 'calendar_entries', instance.masterId);
             batch.delete(docRef);
         } else {
             const currentUpdates = masterUpdates.get(instance.masterId) || { exceptions: { ...masterEntry.exceptions } };
             currentUpdates.exceptions[instance.date] = { ...currentUpdates.exceptions[instance.date], movedFrom: "deleted" };
             masterUpdates.set(instance.masterId, currentUpdates);
         }
     }
     
     for (const [id, updates] of masterUpdates.entries()) {
         const docRef = doc(firestore, 'calendars', activeCalendarId, 'calendar_entries', id);
         batch.update(docRef, updates);
     }
     await batch.commit();
     
     toast({ title: `${selectedInstances.length} entries deleted.` });
     setSelectionMode(false);
     setSelectedInstances([]);
  }

  const handleSaveGoal = async (goal: Omit<Goal, 'id'> & { id?: string }) => {
    if (!activeCalendarId) return;
    if (goal.id) {
        await updateDoc(doc(firestore, 'calendars', activeCalendarId, 'goals', goal.id), { ...goal, updated_at: serverTimestamp() });
    } else {
        await addDoc(collection(firestore, 'calendars', activeCalendarId, 'goals'), { ...goal, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    }
  }
  
  const handleDeleteGoal = async (id: string) => {
    if (!activeCalendarId) return;
    await deleteDoc(doc(firestore, 'calendars', activeCalendarId, 'goals', id));
  }
  
  const handleSaveBirthday = async (birthday: Omit<Birthday, 'id'> & { id?: string }) => {
    if (!activeCalendarId) return;
    if (birthday.id) {
        await updateDoc(doc(firestore, 'calendars', activeCalendarId, 'birthdays', birthday.id), { ...birthday, updated_at: serverTimestamp() });
    } else {
        await addDoc(collection(firestore, 'calendars', activeCalendarId, 'birthdays'), { ...birthday, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    }
  }
  
  const handleDeleteBirthday = async (id: string) => {
     if (!activeCalendarId) return;
     await deleteDoc(doc(firestore, 'calendars', activeCalendarId, 'birthdays', id));
  }

  const openNewEntryDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };
  

  const openDayEntriesDialog = (holidays: Holiday[], dayBirthdays: Birthday[]) => {
    setDayEntriesDialogOpen(true);
  };

  const handleEditFromDayDialog = (entry: Entry) => {
    setDayEntriesDialogOpen(false);
    const originalEntryId = getOriginalIdFromInstance(entry.id);
    const masterEntry = entries.find(e => e.id === originalEntryId);
    if (!masterEntry) {
        console.error("Could not find master entry for editing:", entry.id);
        return;
    }
    const instanceForEdit = { ...masterEntry, ...entry };
    setEditingEntry(instanceForEdit);
    setEntryDialogOpen(true);
  };
  
  const handleAddFromDayDialog = () => {
    if (!selectedDate) return;
    setDayEntriesDialogOpen(false);
    openNewEntryDialog(selectedDate);
  }

  const budgetScore = useMemo(() => {
      if (allGeneratedEntries.length === 0) return null;
      return calculateBudgetScore(allGeneratedEntries, timezone);
  }, [allGeneratedEntries, timezone]);

  const dojoRank = useMemo(() => {
    const primaryGoal = goals.length > 0 ? goals[0] : null;
    return getDojoRank(primaryGoal);
  }, [goals]);
  
  const seasonalEvents = useMemo(() => {
    const now = parseDateInTimezone(new Date(), timezone);
    const next30Days = add(now, {days: 30});
    const holidays = getHolidaysForYear(getYear(now));
    
    const events: SeasonalEvent[] = [];
    
    holidays.forEach(h => {
        if(isWithinInterval(h.date, {start: now, end: next30Days})) {
            events.push({
                date: format(h.date, 'yyyy-MM-dd'),
                name: h.name,
                expected_spend: 50, // placeholder
            })
        }
    });

    birthdays.forEach(b => {
        if (typeof b.date !== 'string' || !b.date.includes('-')) return;
        const [month, day] = b.date.split('-').map(Number);
        const bdate = set(now, {month: month-1, date: day});
        if(isWithinInterval(bdate, {start: now, end: next30Days})) {
             events.push({
                date: format(bdate, 'yyyy-MM-dd'),
                name: b.name,
                expected_spend: b.budget || 50,
            })
        }
    })
    
    return events;
  }, [birthdays, timezone]);
  

  useEffect(() => {
    if (budgetScore) {
      setBudgetScoreHistory(prevHistory => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const yesterdayStr = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
        
        const lastEntryDate = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1].date : null;
        
        if (lastEntryDate !== todayStr) {
           const newHistory = [...prevHistory.filter(h => h.date > yesterdayStr), budgetScore];
           return newHistory;
        }
        return prevHistory;
      });
    }
  }, [budgetScore, setBudgetScoreHistory]);

  useEffect(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if(lastWelcomeMessage?.date !== todayStr) {
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        toast({ title: 'A Word from Sensei', description: randomMessage });
        setLastWelcomeMessage({ message: randomMessage, date: todayStr });
    }
  }, [lastWelcomeMessage, toast, setLastWelcomeMessage]);


  useEffect(() => {
    if (!authLoading && !user) {
        router.replace('/login');
    }
  }, [user, authLoading, router]);

  const rootRef = useRef<HTMLDivElement>(null);


  if (authLoading || !user) {
    return <CentseiLoader isAuthLoading />;
  }

  const { handleMoveEntry, handleInstancePaidToggle, handleReorder } = useEntrySeriesActions({
    user,
    firestore,
    calendarId: activeCalendarId || '',
    entries,
    setEntries,
    timezone,
    toast,
    setMoveRequest,
  });

  return (
    <>
      <div ref={rootRef} className="flex h-screen w-full flex-col bg-background">
        <DashboardTopbar
          isMobile={isMobile}
          user={user}
          signOut={signOut}
          setCalculatorOpen={setCalculatorOpen}
          setSettingsDialogOpen={setSettingsDialogOpen}
          setMonthlySummaryOpen={setMonthlySummaryOpen}
          setMonthlyBreakdownOpen={setMonthlyBreakdownOpen}
          setEnsoInsightsOpen={setEnsoInsightsOpen}
          setGoalsOpen={setGoalsOpen}
          setSenseiEvalOpen={setSenseiEvalOpen}
          setDojoJourneyOpen={setDojoJourneyOpen}
          senseiSays={senseiSays}
          isMobileSheetOpen={isMobileSheetOpen}
          setMobileSheetOpen={setMobileSheetOpen}
          mobileMenuFabRef={mobileMenuFabRef}
          mobileMenuPosition={mobileMenuPosition}
          mobileMenuHandlers={mobileMenuHandlers}
          isMobileMenuDragging={isMobileMenuDragging}
          payPeriods={payPeriods}
          activePeriodIndex={activePeriodIndex}
          initialBalance={initialBalance}
        />

        <DashboardCalendarArea
          isMobile={isMobile}
          entries={entries as any[]}
          generatedEntries={allGeneratedEntries}
          timezone={timezone}
          openNewEntryDialog={openNewEntryDialog}
          setEditingEntry={setEditingEntry}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate as any}
          setEntryDialogOpen={setEntryDialogOpen}
          openDayEntriesDialog={() => setDayEntriesDialogOpen(true)}
          payPeriods={payPeriods}
          isSelectionMode={isSelectionMode}
          setSelectionMode={setSelectionMode}
          selectedInstances={selectedInstances}
          setSelectedInstances={setSelectedInstances as any}
          onBulkDelete={() => { if (selectedInstances.length > 0) handleBulkDelete(); }}
          onMoveRequest={(entry, newDate) => { entry.recurrence === 'none' ? handleMoveEntry(entry, newDate, false) : setMoveRequest({ entry, newDate }); }}
          birthdays={birthdays}
          budgetScore={budgetScore}
          dojoRank={dojoRank}
          goals={goals}
          onScoreInfoClick={() => setScoreInfoOpen(true)}
          onScoreHistoryClick={() => setScoreHistoryOpen(true)}
          onDojoInfoClick={() => setDojoInfoOpen(true)}
          activePeriodIndex={activePeriodIndex}
          initialBalance={initialBalance}
          onInstancePaidToggle={handleInstancePaidToggle}
        />
      </div>

      <EntryDialog
        isOpen={isEntryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSave={handleSaveEntry}
        onCopy={handleCopyEntry}
        onDelete={handleDeleteConfirmation}
        entry={editingEntry}
        selectedDate={selectedDate || new Date()}
        timezone={timezone}
      />
      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        rolloverPreference={rolloverPreference}
        onRolloverPreferenceChange={setRolloverPreference}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        onNotificationsToggle={handleNotificationsToggle}
        onManageBirthdays={() => setBirthdaysOpen(true)}
        entries={entries}
        onEntriesChange={setEntries}
        goals={goals}
        onGoalsChange={setGoals}
        birthdays={birthdays}
        onBirthdaysChange={setBirthdays}
        initialBalance={0}
        onInitialBalanceChange={()=>{}}
      />
       {selectedDate && <DayEntriesDialog
        isOpen={isDayEntriesDialogOpen}
        onClose={() => setDayEntriesDialogOpen(false)}
        date={selectedDate}
        entries={allGeneratedEntries.filter(entry => isSameDay(parseDateInTimezone(entry.date, timezone), selectedDate))}
        holidays={getHolidaysForYear(getYear(selectedDate)).filter(h => isSameDay(h.date, selectedDate))}
        birthdays={birthdays.filter(b => {
             if (typeof b.date !== 'string' || !b.date.includes('-')) return false;
             const [bMonth, bDay] = b.date.split('-').map(Number);
             return getMonth(selectedDate) + 1 === bMonth && selectedDate.getDate() === bDay;
        })}
        onAddEntry={handleAddFromDayDialog}
        onEditEntry={handleEditFromDayDialog}
        onDeleteEntry={handleDeleteConfirmation}
        onReorder={handleReorder}
      />}
      <MonthlyBreakdownDialog
        isOpen={isMonthlyBreakdownOpen}
        onClose={() => setMonthlyBreakdownOpen(false)}
        entries={allGeneratedEntries}
        currentMonth={currentMonth}
        timezone={timezone}
      />
       <MonthlySummaryDialog
        isOpen={isMonthlySummaryOpen}
        onClose={() => setMonthlySummaryOpen(false)}
        periods={payPeriods}
       />
       <CalculatorDialog
         isOpen={isCalculatorOpen}
         onClose={() => setCalculatorOpen(false)}
        />
        <GoalsDialog
            isOpen={isGoalsOpen}
            onClose={() => setGoalsOpen(false)}
            goals={goals}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
        />
        <BirthdaysDialog
            isOpen={isBirthdaysOpen}
            onClose={() => setBirthdaysOpen(false)}
            birthdays={birthdays}
            onSaveBirthday={handleSaveBirthday}
            onDeleteBirthday={handleDeleteBirthday}
        />
         <EnsoInsightsDialog
            isOpen={isEnsoInsightsOpen}
            onClose={() => setEnsoInsightsOpen(false)}
            entries={allGeneratedEntries}
            goals={goals}
            birthdays={birthdays}
            timezone={timezone}
        />
        <BudgetScoreInfoDialog isOpen={isScoreInfoOpen} onClose={() => setScoreInfoOpen(false)} />
        <BudgetScoreHistoryDialog isOpen={isScoreHistoryOpen} onClose={() => setScoreHistoryOpen(false)} history={budgetScoreHistory} />
        <DojoJourneyInfoDialog isOpen={isDojoInfoOpen} onClose={() => setDojoInfoOpen(false)} />
        <SenseiEvaluationDialog 
            isOpen={isSenseiEvalOpen} 
            onClose={() => setSenseiEvalOpen(false)}
            budgetScore={budgetScore}
            onInfoClick={() => setScoreInfoOpen(true)}
            onHistoryClick={() => setScoreHistoryOpen(true)}
        />
        <DojoJourneyDialog 
            isOpen={isDojoJourneyOpen}
            onClose={() => setDojoJourneyOpen(false)}
            rank={dojoRank}
            onInfoClick={() => setDojoInfoOpen(true)}
        />


      <AlertDialog open={!!updateRequest || !!entryToDelete || !!moveRequest} onOpenChange={(open) => {
        if (!open) {
            setUpdateRequest(null);
            setEntryToDelete(null);
            setMoveRequest(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Recurring Entry</AlertDialogTitle>
            <AlertDialogDescription>
              {moveRequest ? "How would you like to move this entry?" : entryToDelete ? "Delete this recurring entry?" : "How would you like to update this entry?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
              <Button className="w-full" onClick={() => {
                  if(updateRequest) handleSaveEntry(updateRequest.entry, false);
                  if(entryToDelete) handleDeleteEntry(entryToDelete.instanceId, false);
                  if(moveRequest) handleMoveEntry(moveRequest.entry, moveRequest.newDate, false);
              }}>
                 Just this one
                 <p className="font-normal text-xs text-muted-foreground/80 ml-2">Applies changes to this occurrence only.</p>
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => {
                  if(updateRequest) handleSaveEntry(updateRequest.entry, true);
                  if(entryToDelete) handleDeleteEntry(entryToDelete.instanceId, true);
                  if(moveRequest) handleMoveEntry(moveRequest.entry, moveRequest.newDate, true);
              }}>
                  This and Future
                 <p className="font-normal text-xs text-muted-foreground/80 ml-2">Updates all entries in this series.</p>
              </Button>
          </div>
          <AlertDialogFooter className="!justify-center">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <SenseiSaysUI 
        sensei={senseiSays}
        budgetScore={budgetScore}
        dojoRank={dojoRank}
        weeklyTotals={{income: 0, bills: 0, net: 0}}
        seasonalEvents={seasonalEvents}
        goals={goals}
      />
    </>
  );
}
