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
import type { Entry, RolloverPreference, WeeklyBalances, SelectedInstance, BudgetScore, DojoRank, Goal, Birthday, Holiday, SeasonalEvent, MasterEntry } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
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
import { moveOneTime, moveSeries, moveSingleOccurrence, validateMaster, updateSeries, updateSingleOccurrence, deleteSeries, deleteSingleOccurrence } from "@/lib/move";
import { parseDateInTimezone } from "@/lib/time";


const generateRecurringInstances = (entry: MasterEntry, start: Date, end: Date, timezone: string): Entry[] => {
  if (!entry.date) return [];

  const instanceMap = new Map<string, Entry>();
  
  const anchorDate = parseDateInTimezone(entry.date, timezone);
  const floorDate = start; // Simplified: start of the viewing window
  
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
  const { user, isGuest, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const pathname = usePathname();
  useBlockMobileContextMenu(pathname === "/" || pathname?.startsWith("/view"));
  useBodyNoCalloutToggle();

  const [entries, setEntries] = useLocalStorage<MasterEntry[]>('centseiEntries', []);
  const [goals, setGoals] = useLocalStorage<Goal[]>('centseiGoals', []);
  const [birthdays, setBirthdays] = useLocalStorage<Birthday[]>('centseiBirthdays', []);
  const [rolloverPreference, setRolloverPreference] = useLocalStorage<RolloverPreference>('centseiRollover', 'carryover');
  const [timezone, setTimezone] = useLocalStorage<string>('centseiTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage('centseiNotificationsEnabled', false);
  const [budgetScoreHistory, setBudgetScoreHistory] = useLocalStorage<BudgetScore[]>('centseiBudgetScoreHistory', []);
  const [lastWelcomeMessage, setLastWelcomeMessage] = useLocalStorage<{ message: string, date: string } | null>('centseiLastWelcome', null);
  
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
  const [weeklyBalances, setWeeklyBalances] = useState<WeeklyBalances>({});
  
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<SelectedInstance[]>([]);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [moveRequest, setMoveRequest] = useState<{entry: Entry, newDate: string} | null>(null);
  const [saveRequest, setSaveRequest] = useState<SaveRequest | null>(null);


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

  // Use Firestore for data if user is logged in
  useEffect(() => {
    if (!user) {
        // If user logs out, the useLocalStorage hooks will take over.
        settingsLoadedRef.current = null; // Reset for potential re-login
        return;
    }
    const entriesQuery = query(collection(firestore, 'users', user.uid, 'calendar_entries'));
    const goalsQuery = query(collection(firestore, 'users', user.uid, 'goals'));
    const birthdaysQuery = query(collection(firestore, 'users', user.uid, 'birthdays'));
    
    const settingsDocRef = doc(firestore, 'users', user.uid);
    const unsubSettings = onSnapshot(settingsDocRef, (doc) => {
        // Prevent infinite loop by only setting state once per user login
        if (settingsLoadedRef.current === user.uid) return;

        const settings = doc.data()?.settings;
        if (settings) {
            if (settings.rolloverPreference) setRolloverPreference(settings.rolloverPreference);
            if (settings.timezone) setTimezone(settings.timezone);
            if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled);
            settingsLoadedRef.current = user.uid; // Mark as loaded
        }
    });

    const unsubEntries = onSnapshot(entriesQuery, snapshot => {
        const cloudEntries = snapshot.docs.map(d => ({...d.data(), id: d.id } as MasterEntry));
        setEntries(cloudEntries);
    });

    const unsubGoals = onSnapshot(goalsQuery, snapshot => {
        const cloudGoals = snapshot.docs.map(d => ({...d.data(), id: d.id } as Goal));
        setGoals(cloudGoals);
    });
    
    const unsubBirthdays = onSnapshot(birthdaysQuery, snapshot => {
        const cloudBirthdays = snapshot.docs.map(d => ({...d.data(), id: d.id } as Birthday));
        setBirthdays(cloudBirthdays);
    });

    return () => {
        unsubEntries();
        unsubGoals();
        unsubBirthdays();
        unsubSettings();
    };
  }, [user, setEntries, setGoals, setBirthdays, setRolloverPreference, setTimezone, setNotificationsEnabled]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        jsConfettiRef.current = new JSConfetti();
        gsap.registerPlugin(MotionPathPlugin);
    }
  }, []);

  const allGeneratedEntries = useMemo(() => {
    if (entries.length === 0) return [];
    
    const viewStart = startOfMonth(subMonths(new Date(), 12));
    const viewEnd = endOfMonth(addMonths(new Date(), 24));

    return entries.flatMap((e) => generateRecurringInstances(e, viewStart, viewEnd, timezone));
  }, [entries, timezone]);
  
  useEffect(() => {
    if (allGeneratedEntries.length === 0) {
        setWeeklyBalances({});
        return;
    }

    const newWeeklyBalances: WeeklyBalances = {};
    const sortedEntries = [...allGeneratedEntries].sort((a,b) => a.date.localeCompare(b.date));
        
    const firstDate = parseDateInTimezone(sortedEntries[0].date, timezone);
    const lastDate = parseDateInTimezone(sortedEntries[sortedEntries.length - 1].date, timezone);
    
    const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate });
    let lastWeekBalance = 0;
    
    let previousMonth = -1;

    weeks.forEach(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        const entriesForWeek = allGeneratedEntries.filter(e => {
            const entryDate = parseDateInTimezone(e.date, timezone);
            return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
        });
        
        const income = entriesForWeek.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const bills = entriesForWeek.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
        
        if(rolloverPreference === 'reset') {
            const currentMonth = weekStart.getMonth();
            if(currentMonth !== previousMonth) {
                lastWeekBalance = 0;
            }
            previousMonth = currentMonth;
        }

        let currentWeekStartBalance = lastWeekBalance;

        const endOfWeekBalance = currentWeekStartBalance + income - bills;
        newWeeklyBalances[weekKey] = { start: currentWeekStartBalance, end: endOfWeekBalance };
        lastWeekBalance = endOfWeekBalance;
    });
    
    if (JSON.stringify(newWeeklyBalances) !== JSON.stringify(weeklyBalances)) {
        setWeeklyBalances(newWeeklyBalances);
    }
  }, [allGeneratedEntries, rolloverPreference, timezone, weeklyBalances]);

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
  
  const processSaveRequest = (entryData: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string }) => {
    const masterId = entryData.id ? getOriginalIdFromInstance(entryData.id) : undefined;
    const masterEntry = masterId ? entries.find(e => e.id === masterId) : undefined;
    
    if (!masterEntry) { // Case A: New entry
      handleSaveEntry({ ...entryData }, true);
      return;
    }
    
    const newDateStr = format(entryData.date, 'yyyy-MM-dd');
    const oldDateStr = entryData.originalDate;
    const hasDateChanged = oldDateStr && newDateStr !== oldDateStr;

    // Case B: Recurring entry, date has changed
    if (masterEntry.recurrence !== 'none' && hasDateChanged) {
        setMoveRequest({ entry: { ...entryData, id: entryData.id || '' }, newDate: newDateStr });
        return;
    }

    // Check for core field changes
    const coreFields: (keyof Entry)[] = ['name', 'amount', 'category', 'recurrence', 'recurrenceEndDate', 'recurrenceCount', 'type'];
    const hasCoreInfoChanged = coreFields.some(field => {
        const formValue = (entryData as any)[field];
        const masterValue = (masterEntry as any)[field];

        if (field === 'recurrenceEndDate') {
             const formDate = formValue ? format(formValue, 'yyyy-MM-dd') : null;
             const masterDate = masterValue ? format(parseDateInTimezone(masterValue, timezone), 'yyyy-MM-dd') : null;
             return formDate !== masterDate;
        }

        return formValue !== masterValue;
    });

    if (masterEntry.recurrence !== 'none' && hasCoreInfoChanged) { // Case C
        setSaveRequest({ entryData, updateAll: false }); // Ask user
        return;
    }

    // Case D: Recurring entry, only instance fields changed (or it's a one-time entry)
    handleSaveEntry(entryData, masterEntry.recurrence === 'none');
  };

  const handleSaveEntry = async (entryToSave: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string }, updateAll: boolean) => {
    const { originalDate, ...data } = entryToSave;
    const masterId = data.id ? getOriginalIdFromInstance(data.id) : undefined;
    let masterEntry = masterId ? entries.find(e => e.id === masterId) : undefined;
    
    let updatedEntry: MasterEntry;

    if (!masterEntry) { // This is a new entry
        const saveData: any = { ...data, date: format(data.date, 'yyyy-MM-dd') };
         if (saveData.recurrenceEndDate && saveData.recurrenceEndDate instanceof Date) {
            saveData.recurrenceEndDate = format(saveData.recurrenceEndDate, 'yyyy-MM-dd');
        }
        delete saveData.id;
        delete saveData.originalDate;

        if(user && firestore) {
            await addDoc(collection(firestore, 'users', user.uid, 'calendar_entries'), stripUndefined({ ...saveData, created_at: serverTimestamp(), updated_at: serverTimestamp() }));
        } else {
            setEntries(prev => [...prev, { ...saveData, id: crypto.randomUUID() }]);
        }
    } else { // This is an existing entry
        if (updateAll) {
            updatedEntry = updateSeries(masterEntry, data);
        } else {
            const instanceDate = originalDate || format(data.date, 'yyyy-MM-dd');
            updatedEntry = updateSingleOccurrence(masterEntry, instanceDate, data);
        }

        validateMaster(updatedEntry);

        if (user && firestore) {
            const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
            await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
        } else {
            setEntries(prev => prev.map(e => e.id === masterId ? updatedEntry : e));
        }
    }

    if(notificationsEnabled) scheduleNotificationsLocal(entries, timezone, toast);
    toast({ title: 'Entry Saved', description: `Your ${data.type} has been saved.` });
    setEntryDialogOpen(false);
    setEditingEntry(null);
    setSaveRequest(null);
  };
  
  const handleCopyEntry = (entry: Entry) => {
    if (!selectedDate) return;
    const copy = { ...entry, id: '', date: format(selectedDate, 'yyyy-MM-dd') };
    setEditingEntry(copy as Entry);
    setEntryDialogOpen(true);
  }

  const handleDeleteEntry = (entry: Entry) => {
    const masterId = getOriginalIdFromInstance(entry.id);
    const masterEntry = entries.find(e => e.id === masterId);
    if (!masterEntry) return;

    if (masterEntry.recurrence === 'none') {
        // It's a non-recurring entry, delete it directly.
        handleDeleteConfirmed(entry.id, true);
    } else {
        // It's a recurring entry, so we show the confirmation dialog.
        setEntryToDelete(entry);
    }
  };

  const handleDeleteConfirmed = async (instanceOrMasterId: string, deleteAll: boolean) => {
    const masterId = getOriginalIdFromInstance(instanceOrMasterId);
    const masterEntry = entries.find(e => e.id === masterId);
    if (!masterEntry) return;

    if (deleteAll) {
        // Delete the entire series
        if (user && firestore) {
            const masterDocRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
            await deleteDoc(masterDocRef);
        } else {
            setEntries(prevEntries => prevEntries.filter(e => e.id !== masterId));
        }
    } else {
        // Delete just this one occurrence
        const updatedEntry = deleteSingleOccurrence(masterEntry, instanceOrMasterId.substring(masterId.length + 1));
        if (user && firestore) {
            const masterDocRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
            await updateDoc(masterDocRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
        } else {
            setEntries(prev => prev.map(e => (e.id === masterId ? updatedEntry : e)));
        }
    }
    
    setEntryToDelete(null);
    setEntryDialogOpen(false); // Close the entry dialog if it was open
    toast({ title: 'Entry Deleted' });
  };
  
  const handleBulkDelete = async () => {
     if (user) {
        const batch = writeBatch(firestore);
        const masterUpdates = new Map<string, any>();
        
        for(const instance of selectedInstances) {
            const masterEntry = entries.find(e => e.id === instance.masterId);
            if(!masterEntry) continue;
            
            if(masterEntry.recurrence === 'none') {
                const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', instance.masterId);
                batch.delete(docRef);
            } else {
                const currentUpdates = masterUpdates.get(instance.masterId) || { exceptions: { ...masterEntry.exceptions } };
                currentUpdates.exceptions[instance.date] = { ...currentUpdates.exceptions[instance.date], movedFrom: "deleted" };
                masterUpdates.set(instance.masterId, currentUpdates);
            }
        }
        
        for (const [id, updates] of masterUpdates.entries()) {
            const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', id);
            batch.update(docRef, updates);
        }
        await batch.commit();

     } else {
        setEntries(prevEntries => {
          const masterUpdates: Record<string, any> = {};
          
          for (const instance of selectedInstances) {
            const masterEntry = prevEntries.find(e => e.id === instance.masterId);
            if (!masterEntry) continue;

            if (masterEntry.recurrence === 'none') {
              masterUpdates[instance.masterId] = { delete: true };
            } else {
              if (!masterUpdates[instance.masterId]) {
                masterUpdates[instance.masterId] = { exceptions: { ...masterEntry?.exceptions } };
              }
              masterUpdates[instance.masterId].exceptions[instance.date] = {
                ...masterUpdates[instance.masterId].exceptions[instance.date],
                movedFrom: 'deleted',
              };
            }
          }

          let updatedEntries = prevEntries;
          Object.entries(masterUpdates).forEach(([masterId, update]) => {
            if (update.delete) {
              updatedEntries = updatedEntries.filter(e => e.id !== masterId);
            } else {
              updatedEntries = updatedEntries.map(e =>
                e.id === masterId ? { ...e, exceptions: update.exceptions } : e
              );
            }
          });
          
          return updatedEntries;
        });
     }
     
     toast({ title: `${selectedInstances.length} entries deleted.` });
     setSelectionMode(false);
     setSelectedInstances([]);
  }

  const handleMoveEntry = async (entryToMove: Entry, newDate: string, moveAll: boolean) => {
    const masterId = getOriginalIdFromInstance(entryToMove.id);
    const masterEntry = entries.find(e => e.id === masterId);
    if (!masterEntry) return;

    let updatedEntry: MasterEntry;

    if (masterEntry.recurrence === 'none') {
      updatedEntry = moveOneTime(masterEntry, entryToMove.date, newDate);
    } else if (moveAll) {
      updatedEntry = moveSeries(masterEntry, newDate);
    } else {
      updatedEntry = moveSingleOccurrence(masterEntry, entryToMove.date, newDate);
    }
     
    validateMaster(updatedEntry);

    if (user && firestore) {
      const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
      await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
    } else {
      setEntries(prev => prev.map(e => (e.id === masterId ? updatedEntry : e)));
    }
     
    setMoveRequest(null);
    toast({ title: 'Entry Moved', description: `Moved to ${format(parseDateInTimezone(newDate, timezone), 'MMM d, yyyy')}` });
  };
  
  const handleInstancePaidToggle = async (instanceId: string, isPaid: boolean) => {
    const masterId = getOriginalIdFromInstance(instanceId);
    const masterEntry = entries.find(e => e.id === masterId);
    if (!masterEntry) return;
    
    const instanceDate = instanceId.substring(masterId.length + 1);
    
    // Create an exception for this one instance
    const updatedEntry = updateSingleOccurrence(masterEntry, instanceDate, { isPaid });
    
    if (user && firestore) {
        const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
        await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
    } else {
        setEntries(prev => prev.map(e => (e.id === masterId ? updatedEntry : e)));
    }
  };

  const handleSaveGoal = async (goal: Omit<Goal, 'id'> & { id?: string }) => {
    if (user) {
        if (goal.id) {
            await updateDoc(doc(firestore, 'users', user.uid, 'goals', goal.id), { ...goal, updated_at: serverTimestamp() });
        } else {
            await addDoc(collection(firestore, 'users', user.uid, 'goals'), { ...goal, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        }
    } else {
        setGoals(prev => goal.id ? prev.map(g => g.id === goal.id ? {...g, ...goal} : g) : [...prev, {...goal, id: crypto.randomUUID()}] );
    }
  }
  
  const handleDeleteGoal = async (id: string) => {
    if (user) {
        await deleteDoc(doc(firestore, 'users', user.uid, 'goals', id));
    } else {
        setGoals(prev => prev.filter(g => g.id !== id));
    }
  }
  
  const handleSaveBirthday = async (birthday: Omit<Birthday, 'id'> & { id?: string }) => {
    if (user) {
        if (birthday.id) {
            await updateDoc(doc(firestore, 'users', user.uid, 'birthdays', birthday.id), { ...birthday, updated_at: serverTimestamp() });
        } else {
            await addDoc(collection(firestore, 'users', user.uid, 'birthdays'), { ...birthday, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        }
    } else {
      setBirthdays(prev => birthday.id ? prev.map(b => b.id === birthday.id ? {...b, ...birthday} : b) : [...prev, {...birthday, id: crypto.randomUUID()}] );
    }
  }
  
  const handleDeleteBirthday = async (id: string) => {
     if (user) {
        await deleteDoc(doc(firestore, 'users', user.uid, 'birthdays', id));
    } else {
      setBirthdays(prev => prev.filter(b => b.id !== id));
    }
  }

  const handleReorder = async (orderedEntries: Entry[]) => {
    if (user) {
        const batch = writeBatch(firestore);
        const masterUpdates = new Map<string, any>();
        
        orderedEntries.forEach((entry, index) => {
            const masterId = getOriginalIdFromInstance(entry.id);
            const masterEntry = entries.find(e => e.id === masterId);
            if (!masterEntry) return;

            const currentUpdates = masterUpdates.get(masterId) || { exceptions: { ...masterEntry.exceptions } };
            
            // Set the order for this specific instance date
            currentUpdates.exceptions[entry.date] = { ...currentUpdates.exceptions[entry.date], order: index };
            masterUpdates.set(masterId, currentUpdates);
        });

        for (const [id, updates] of masterUpdates.entries()) {
            const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', id);
            batch.update(docRef, { exceptions: stripUndefined(updates.exceptions) });
        }
        await batch.commit();
    } else {
        setEntries(prevEntries => {
            const masterUpdates: { [key: string]: any } = {};

            orderedEntries.forEach((entry, index) => {
                const masterId = getOriginalIdFromInstance(entry.id);
                 if (!masterUpdates[masterId]) {
                    const masterEntry = prevEntries.find(e => e.id === masterId);
                    masterUpdates[masterId] = { exceptions: { ...masterEntry?.exceptions } };
                 }
                 masterUpdates[masterId].exceptions[entry.date] = { ...masterUpdates[masterId].exceptions[entry.date], order: index };
            });

            return prevEntries.map(e => {
                if (masterUpdates[e.id]) {
                    return { ...e, exceptions: masterUpdates[e.id].exceptions };
                }
                return e;
            });
        });
    }

    toast({ title: 'Order Saved', description: 'Your new entry order has been saved.' });
  };


  const openNewEntryDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };
  
  const handleDayInteraction = (day: Date) => {
    if (isMobile) return;
    const dayEntries = allGeneratedEntries.filter(entry => isSameDay(parseDateInTimezone(entry.date, timezone), day));
    const dayHolidays = getHolidaysForYear(getYear(day)).filter(h => isSameDay(h.date, day));
    const dayBirthdays = birthdays.filter(b => {
      if (typeof b.date !== 'string' || !b.date.includes('-')) return false;
      const [bMonth, bDay] = b.date.split('-').map(Number);
      return getMonth(day) + 1 === bMonth && day.getDate() === bDay;
    });

    if (dayEntries.length > 0 || dayHolidays.length > 0 || dayBirthdays.length > 0) {
      setDayEntriesDialogOpen(true);
    }
  };

  const handleEditFromDayDialog = (entry: Entry) => {
    setDayEntriesDialogOpen(false);
    // Find the master to make sure we have the full, non-overridden entry data
    const originalEntryId = getOriginalIdFromInstance(entry.id);
    const masterEntry = entries.find(e => e.id === originalEntryId);
    if (!masterEntry) {
        console.error("Could not find master entry for editing:", entry.id);
        return;
    }
    // Create the instance object for the dialog, combining master with instance-specific details
    const instanceForEdit = { ...masterEntry, ...entry };
    setEditingEntry(instanceForEdit);
    setEntryDialogOpen(true);
  };
  
  const handleAddFromDayDialog = () => {
    if (!selectedDate) return;
    setDayEntriesDialogOpen(false);
    openNewEntryDialog(selectedDate);
  }

  const weeklyTotals = useMemo(() => {
    if (!selectedDate) {
        return { income: 0, bills: 0, net: 0, startOfWeekBalance: 0, status: 0 };
    }
    const weekStart = startOfWeek(selectedDate);
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    const weekBalanceInfo = weeklyBalances[weekKey];
    const startOfWeekBalance = weekBalanceInfo ? weekBalanceInfo.start : 0;

    const weekEntries = allGeneratedEntries.filter(e => {
        const entryDate = parseDateInTimezone(e.date, timezone);
        return isWithinInterval(entryDate, {start: weekStart, end: endOfWeek(weekStart)});
    });

    const weeklyIncome = weekEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const weeklyBills = weekEntries.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);

    return {
        income: weeklyIncome,
        bills: weeklyBills,
        net: startOfWeekBalance + weeklyIncome - weeklyBills,
        startOfWeekBalance: startOfWeekBalance,
        status: weeklyIncome - weeklyBills,
    };
  }, [allGeneratedEntries, selectedDate, weeklyBalances, timezone]);
  
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
    if (!authLoading && !user && !isGuest) {
        router.replace('/login');
    }
  }, [user, isGuest, authLoading, router]);

  const rootRef = useRef<HTMLDivElement>(null);


  if (authLoading || (!user && !isGuest)) {
    return <CentseiLoader isAuthLoading />;
  }
  
  if (!authLoading && !user && isGuest) {
      // Potentially show a "continue as guest" splash screen before rendering dashboard
  }

  return (
    <>
      <div ref={rootRef} className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-20 items-center justify-between border-b px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
          </div>
          <div className="flex items-center gap-2">
            {isMobile && (
              <div
                ref={mobileMenuFabRef}
                className="fixed z-50"
                style={{
                  right: `${mobileMenuPosition.x}px`,
                  bottom: `${mobileMenuPosition.y}px`,
                }}
                {...mobileMenuHandlers}
              >
                 <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                    <SheetTrigger asChild>
                      <Button
                        aria-label="Open Menu"
                        className={cn(
                          "h-16 w-16 rounded-full shadow-xl flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 touch-none",
                          isMobileMenuDragging && "cursor-grabbing"
                        )}
                      >
                         <Menu />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 flex flex-col w-3/4">
                      <SheetHeader className="p-4 border-b">
                        <SheetTitle>Week of {selectedDate ? format(startOfWeek(selectedDate), "MMM d") : ''}</SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="flex-1">
                        {selectedDate && <SidebarContent
                          weeklyTotals={weeklyTotals}
                          selectedDate={selectedDate}
                        />}
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
              </div>
            )}

            {!isMobile && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)}>
                  <Calculator className="h-5 w-5" />
                  <span className="sr-only">Calculator</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </>
            )}
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Guest"}/>
                    <AvatarFallback>{user?.displayName?.[0] || 'G'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || 'Guest User'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMonthlySummaryOpen(true)}><PieChart className="mr-2 h-4 w-4" />Monthly Summary</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMonthlyBreakdownOpen(true)}><BarChartBig className="mr-2 h-4 w-4" />Category Breakdown</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEnsoInsightsOpen(true)}><AreaChart className="mr-2 h-4 w-4" />Enso's Insights</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGoalsOpen(true)}><Target className="mr-2 h-4 w-4" />Zen Goals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSenseiEvalOpen(true)}><TrendingUp className="mr-2 h-4 w-4" />Sensei's Evaluation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDojoJourneyOpen(true)}><Trophy className="mr-2 h-4 w-4" />Dojo Journey</DropdownMenuItem>
                {isMobile && (
                  <>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setCalculatorOpen(true)}><Calculator className="mr-2 h-4 w-4" />Calculator</DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}><Settings className="mr-2 h-4 w-4"/>Settings</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => senseiSays.showFavorites()}><Heart className="mr-2 h-4 w-4" />Favorite Mantras</DropdownMenuItem>
                 <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <CentseiCalendar
          entries={entries}
          generatedEntries={allGeneratedEntries}
          timezone={timezone}
          openNewEntryDialog={openNewEntryDialog}
          setEditingEntry={setEditingEntry}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setEntryDialogOpen={setEntryDialogOpen}
          handleDayInteraction={handleDayInteraction}
          isReadOnly={false}
          weeklyBalances={weeklyBalances}
          weeklyTotals={weeklyTotals}
          isSelectionMode={isSelectionMode}
          toggleSelectionMode={() => setSelectionMode(!isSelectionMode)}
          selectedInstances={selectedInstances}
          setSelectedInstances={setSelectedInstances}
          onBulkDelete={() => {
              if (selectedInstances.length > 0) {
                  handleBulkDelete();
              }
          }}
          onMoveRequest={(entry, newDate) => {
            if (entry.recurrence === 'none') {
                handleMoveEntry(entry, newDate, false);
            } else {
                setMoveRequest({ entry, newDate });
            }
          }}
          birthdays={birthdays}
          budgetScore={budgetScore}
          dojoRank={dojoRank}
          goals={goals}
          onScoreInfoClick={() => setScoreInfoOpen(true)}
          onScoreHistoryClick={() => setScoreHistoryOpen(true)}
          onDojoInfoClick={() => setDojoInfoOpen(true)}
          onInstancePaidToggle={handleInstancePaidToggle}
        />
      </div>

      <EntryDialog
        isOpen={isEntryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSave={processSaveRequest}
        onCopy={handleCopyEntry}
        onDelete={handleDeleteEntry}
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
        allEntries={allGeneratedEntries}
        initialMonth={currentMonth}
        weeklyBalances={weeklyBalances}
        timezone={timezone}
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

      <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Delete Recurring Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    This is a recurring entry. How would you like to delete it?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-4 py-4">
                  <Button
                      className="h-auto"
                      variant="destructive"
                      onClick={() => {
                        if (entryToDelete) handleDeleteConfirmed(entryToDelete.id, false);
                      }}>
                      <div className="flex flex-col items-start w-full text-left p-2">
                          <span className="font-semibold">Just this one</span>
                          <span className="font-normal text-xs text-destructive-foreground/80">Deletes only this specific occurrence.</span>
                      </div>
                  </Button>
                  <Button
                      className="h-auto"
                      variant="secondary"
                      onClick={() => {
                        if (entryToDelete) handleDeleteConfirmed(entryToDelete.id, true);
                      }}>
                      <div className="flex flex-col items-start w-full text-left p-2">
                          <span className="font-semibold">This and future</span>
                          <span className="font-normal text-xs text-secondary-foreground/80">Deletes all entries in this series.</span>
                      </div>
                  </Button>
              </div>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!moveRequest} onOpenChange={() => setMoveRequest(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Move Recurring Entry</AlertDialogTitle>
                <AlertDialogDescription>
                    This is a recurring entry. How would you like to move it?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-4 py-4">
                <Button
                    className="h-auto"
                    variant="default"
                    onClick={() => moveRequest && handleMoveEntry(moveRequest.entry, moveRequest.newDate, false)}>
                    <div className="flex flex-col items-start w-full text-left p-2">
                        <span className="font-semibold">Just this one</span>
                        <span className="font-normal text-xs text-primary-foreground/80">Moves this occurrence to the new date.</span>
                    </div>
                </Button>
                <Button 
                    className="h-auto"
                    variant="secondary" onClick={() => moveRequest && handleMoveEntry(moveRequest.entry, moveRequest.newDate, true)}>
                    <div className="flex flex-col items-start w-full text-left p-2">
                        <span className="font-semibold">This and future</span>
                        <span className="font-normal text-xs text-secondary-foreground/80">Moves the entire series to the new date.</span>
                    </div>
                </Button>
            </div>
             <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={!!saveRequest} onOpenChange={() => setSaveRequest(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Update Recurring Entry</AlertDialogTitle>
                <AlertDialogDescription>
                    This is a recurring entry. How would you like to apply this change?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-4 py-4">
                 <Button 
                    className="h-auto"
                    variant="default"
                    onClick={() => saveRequest && handleSaveEntry(saveRequest.entryData, false)}>
                     <div className="flex flex-col items-start w-full text-left p-2">
                        <span className="font-semibold">Just this one</span>
                        <span className="font-normal text-xs text-primary-foreground/80">Applies changes to this occurrence only.</span>
                    </div>
                </Button>
                 <Button 
                    className="h-auto"
                    variant="secondary" 
                    onClick={() => saveRequest && handleSaveEntry(saveRequest.entryData, true)}>
                    <div className="flex flex-col items-start w-full text-left p-2">
                        <span className="font-semibold">This and future</span>
                        <span className="font-normal text-xs text-secondary-foreground/80">Updates all entries in this series.</span>
                    </div>
                </Button>
            </div>
             <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <SenseiSaysUI 
        sensei={senseiSays}
        budgetScore={budgetScore}
        dojoRank={dojoRank}
        weeklyTotals={weeklyTotals}
        seasonalEvents={seasonalEvents}
        goals={goals}
      />
    </>
  );
}
