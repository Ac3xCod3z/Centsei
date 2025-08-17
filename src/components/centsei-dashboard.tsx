
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
import { subscribeFCM, unsubscribeFCM } from "@/lib/notifications-fcm";
import { MigrationDialog } from './migration-dialog';

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
  const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}-${m[3]}-${m[4]}` : null;
}

export default function CentseiDashboard() {
  const { user, signOut, loading: authLoading, isGuest, exitGuest } = useAuth();
  const router = useRouter();
  
  const [localEntries, setLocalEntries] = useLocalStorage<Entry[]>("centseiEntries", []);
  const [localGoals, setLocalGoals] = useLocalStorage<Goal[]>("centseiGoals", []);
  const [localBirthdays, setLocalBirthdays] = useLocalStorage<Birthday[]>("centseiBirthdays", []);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [rollover, setRollover] = useLocalStorage<RolloverPreference>("centseiRollover", "carryover");
  const [timezone, setTimezone] = useLocalStorage<string>('centseiTimezone', 'UTC');
  const [weeklyBalances, setWeeklyBalances] = useLocalStorage<WeeklyBalances>("centseiWeeklyBalances", {});
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage('centseiNotificationsEnabled', false);
  const [budgetScores, setBudgetScores] = useLocalStorage<BudgetScore[]>('centseiBudgetScores', []);
  const [fcmToken, setFcmToken] = useLocalStorage<string | null>("centseiFcmToken", null);


  const [isEntryDialogOpen, setEntryDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isDayEntriesDialogOpen, setDayEntriesDialogOpen] = useState(false);
  const [dayDialogHolidays, setDayDialogHolidays] = useState<Holiday[]>([]);
  const [dayDialogBirthdays, setDayDialogBirthdays] = useState<Birthday[]>([]);

  const [isBreakdownDialogOpen, setBreakdownDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [isCalculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [isGoalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [isBirthdaysDialogOpen, setBirthdaysDialogOpen] = useState(false);
  const [isScoreInfoDialogOpen, setScoreInfoDialogOpen] = useState(false);
  const [isScoreHistoryDialogOpen, setScoreHistoryDialogOpen] = useState(false);
  const [isDojoInfoDialogOpen, setDojoInfoDialogOpen] = useState(false);
  const [isScoreWidgetOpen, setScoreWidgetOpen] = useState(false);
  const [isDojoWidgetOpen, setDojoWidgetOpen] = useState(false);
  const [isEnsoInsightsOpen, setEnsoInsightsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDataReady, setIsDataReady] = useState(false);
  const [ignoredMasterIds, setIgnoredMasterIds] = useState<string[]>([]);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  const isMobile = useMedia("(max-width: 1024px)", false);
  const { toast } = useToast();
  const sensei = useSenseiSays({
      user,
      onToast: (m) => toast({ description: m }),
      onTrack: (e, p) => console.debug("track:", e, p),
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<SelectedInstance[]>([]);
  const [isBulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false);
  const [isBulkCompleteAlertOpen, setBulkCompleteAlertOpen] = useState(false);
  const [moveOperation, setMoveOperation] = useState<{ entry: Entry, newDate: string } | null>(null);
  const previousScoreRef = useRef<number | null>(null);
  const previousDojoRankRef = useRef<DojoRank | null>(null);
  const confettiRef = useRef<JSConfetti | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [user, authLoading, isGuest, router]);

  useEffect(() => {
    if (user && firestore) {
        const listeners = [
        { path: 'calendar_entries', setter: setEntries },
        { path: 'goals', setter: setGoals },
        { path: 'birthdays', setter: setBirthdays }
        ];

        const unsubscribes = listeners.map(({ path, setter }) => {
        const collRef = collection(firestore, 'users', user.uid, path);
        const q = query(collRef);
        return onSnapshot(q, (querySnapshot) => {
            const items = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            setter(items);
        }, (error) => {
            console.error(`Error listening to ${path}:`, error);
        });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    } else if (isGuest) {
        setEntries(localEntries);
        setGoals(localGoals);
        setBirthdays(localBirthdays);
    }
  }, [user, isGuest, localEntries, localGoals, localBirthdays]);

  useEffect(() => {
    const run = async () => {
      if (!user || !isGuest || !firestore) return;

      const hasLocalData = (localEntries?.length ?? 0) + (localGoals?.length ?? 0) + (localBirthdays?.length ?? 0) > 0;
      if (!hasLocalData) {
        exitGuest();
        return;
      }
  
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists() && userDoc.data()?.migration_done) {
        exitGuest();
        return;
      }
  
      if (!userDoc.exists()) {
        await setDoc(userDocRef, { email: user.email, displayName: user.displayName, photoURL: user.photoURL, created_at: new Date() }, { merge: true });
      }
  
      setShowMigrationDialog(true);
    };
    run();
  }, [user, isGuest, localEntries, localGoals, localBirthdays, exitGuest]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedInstances([]);
  }, []);
  
  const handleBulkDelete = async () => {
    if (selectedInstances.length === 0 || !user || !firestore) return;
  
    try {
      const batch = writeBatch(firestore);
      const newlyIgnored: string[] = [];
  
      for (const instance of selectedInstances) {
        const masterId = getOriginalIdFromInstance(instance.instanceId);
        const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
        const snap = await getDoc(docRef);
  
        if (!snap.exists()) {
          if (!newlyIgnored.includes(masterId)) newlyIgnored.push(masterId);
          continue;
        }
        
        const masterEntry = snap.data() as Entry;
  
        if (masterEntry?.recurrence === 'none') {
          batch.delete(docRef);
        } else {
          batch.update(docRef, { [`exceptions.${instance.date}.movedFrom`]: true });
        }
      }
  
      if (newlyIgnored.length) {
        setIgnoredMasterIds(prev => [...new Set([...prev, ...newlyIgnored])]);
      }
      await batch.commit();
      toggleSelectionMode();
      setBulkDeleteAlertOpen(false);
      toast({ title: `${selectedInstances.length} entries deleted.` });
    } catch (err) {
      console.error("handleBulkDelete error:", err);
      toast({ title: "Bulk delete failed", description: String(err), variant: "destructive" });
    }
  };

  const handleConfirmMove = async () => {
    if (!moveOperation || !user || !firestore) return;
    try {
      const { entry: movedEntry, newDate } = moveOperation;
      const masterId = getOriginalIdFromInstance(movedEntry.id);
      const originalDateStr = movedEntry.date;
      
      const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
      const masterEntry = entries.find((e) => e.id === masterId);
      if (!masterEntry) throw new Error("Master entry not found");

      if (masterEntry.recurrence === "none") {
        await updateDoc(docRef, stripUndefined({ date: newDate, updated_at: serverTimestamp() }));
      } else {
        const newException = stripUndefined({
            movedTo: newDate,
            isPaid: movedEntry.isPaid ?? false,
            order: movedEntry.order ?? null,
            name: movedEntry.name,
            amount: movedEntry.amount,
            type: movedEntry.type,
            ...(movedEntry.category ? { category: movedEntry.category } : {}),
        });

        await updateDoc(docRef, stripUndefined({
            [`exceptions.${originalDateStr}.movedFrom`]: true,
            [`exceptions.${newDate}`]: newException,
            updated_at: serverTimestamp(),
        }));
      }

      setMoveOperation(null);
      toast({
        title: "Entry moved",
        description: `Moved "${movedEntry.name}" to ${format(parseDateInTimezone(newDate, timezone), "PPP")}.`,
      });
    } catch (err) {
      console.error("handleConfirmMove error:", err);
      toast({ title: "Move failed", description: String(err), variant: "destructive" });
    }
  };
  
  const handleBulkMarkAsComplete = async () => {
    if (selectedInstances.length === 0) return;
    try {
      if (user && firestore) {
        const batch = writeBatch(firestore);
        selectedInstances.forEach((instance) => {
          const masterId = getOriginalIdFromInstance(instance.instanceId);
          const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
          batch.update(docRef, { [`exceptions.${instance.date}.isPaid`]: true });
        });
        await batch.commit();
      } else {
        setLocalEntries((prev) => {
          const updated = [...prev];
          selectedInstances.forEach((instance) => {
            const idx = updated.findIndex((e) => e.id === instance.masterId);
            if (idx !== -1) {
              const m = updated[idx];
              if (m.recurrence !== "none") {
                const ex = { ...m.exceptions, [instance.date]: { ...m.exceptions?.[instance.date], isPaid: true } };
                updated[idx] = { ...m, exceptions: ex };
              } else {
                updated[idx] = { ...m, isPaid: true };
              }
            }
          });
          return updated;
        });
      }

      setBulkCompleteAlertOpen(false);
      toast({ title: `${selectedInstances.length} entries marked as complete.` });
      toggleSelectionMode();
    } catch (err) {
      console.error("handleBulkMarkAsComplete error:", err);
      toast({ title: "Bulk complete failed", description: String(err), variant: "destructive" });
    }
  };

  async function handleNotificationsToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
  
    if (enabled) {
      if (user && !isGuest) {
        try {
          const token = await subscribeFCM(user.uid, timezone);
          setFcmToken(token);
          await cancelAllNotificationsLocal(toast);
        } catch (err:any) {
          toast({ title: "Notifications blocked", description: err?.message || "Could not enable push.", variant: "destructive" });
          setNotificationsEnabled(false);
        }
      } else {
        await scheduleNotificationsLocal(entries, timezone, toast);
      }
    } else {
      if (user && !isGuest && fcmToken) {
        await unsubscribeFCM(user.uid, fcmToken);
        setFcmToken(null);
      }
      await cancelAllNotificationsLocal(toast);
    }
  }
  
  useEffect(() => {
    if (isGuest && notificationsEnabled) {
      scheduleNotificationsLocal(entries, timezone, toast);
    }
  }, [entries, timezone, notificationsEnabled, isGuest, toast]);

  const showWelcomeToast = useCallback(() => {
    if (sessionStorage.getItem('centseiWelcomeShown')) return;
    
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    toast({ description: welcomeMessages[randomIndex] });
    sessionStorage.setItem('centseiWelcomeShown', 'true');
  }, [toast]);

  useEffect(() => {
    showWelcomeToast();
    confettiRef.current = new JSConfetti();
  }, [showWelcomeToast]);

  const handleEntrySave = async (
    entryData: Omit<Entry, "id" | "date"> & { id?: string; date: Date; originalDate?: string }
  ) => {
    if (!firestore) {
        toast({title: "Connection Error", description: "Cannot save entry, not connected to the database.", variant: "destructive"});
        return;
    }
    const formattedDate = format(entryData.date, "yyyy-MM-dd");
    const { id, date, ...restOfData } = entryData;
    const masterId = id ? getOriginalIdFromInstance(id) : null;

    const saveData: any = { ...restOfData };

    if (saveData.type !== "bill") {
      delete saveData.category;
      delete saveData.isAutoPay;
    } else {
      if (typeof saveData.category !== "string" || saveData.category.trim() === "") {
        delete saveData.category;
      }
    }
    delete saveData.originalDate;

    try {
      if (masterId && user) {
        const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
        const masterEntry = entries.find((e) => e.id === masterId);

        if (masterEntry?.recurrence !== "none" && entryData.originalDate) {
          const exPath = `exceptions.${entryData.originalDate}`;
          const exceptionUpdate = stripUndefined({
            [`${exPath}.isPaid`]: entryData.isPaid,
            [`${exPath}.name`]: entryData.name,
            [`${exPath}.amount`]: entryData.amount,
            ...(saveData.category ? { [`${exPath}.category`]: saveData.category } : {}),
            updated_at: serverTimestamp(),
          });
          await updateDoc(docRef, exceptionUpdate);
        } else {
          const updatePayload = stripUndefined({
            ...saveData,
            date: formattedDate,
            updated_at: serverTimestamp(),
          });
          await updateDoc(docRef, updatePayload);
        }
        toast({ title: "Saved", description: "Your entry was updated." });
      } else if(user) {
        const newEntry = stripUndefined({
          ...saveData,
          date: formattedDate,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        await addDoc(collection(firestore, "users", user.uid, "calendar_entries"), newEntry);
        toast({ title: "Added", description: "Your entry was created." });
      } else {
        const cleanedData = stripUndefined(saveData);
        if (masterId) {
            setLocalEntries(prev => prev.map(e => e.id === masterId ? { ...e, ...cleanedData, date: formattedDate } : e));
        } else {
            setLocalEntries(prev => [...prev, { ...cleanedData, id: crypto.randomUUID(), date: formattedDate }]);
        }
      }
    } catch (err) {
      console.error("handleEntrySave error:", err);
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  };

  const handleEntryDelete = async (id: string) => {
    if (!user) { // Guest mode deletion
      const masterId = getOriginalIdFromInstance(id);
      const instanceDate = getInstanceDate(id);
      const masterEntry = localEntries.find(e => e.id === masterId);
  
      if (instanceDate && masterEntry && masterEntry.recurrence !== 'none') {
        const nextEntries = localEntries.map(e => {
          if (e.id === masterId) {
            return { ...e, exceptions: { ...e.exceptions, [instanceDate]: { ...e.exceptions?.[instanceDate], movedFrom: true } } };
          }
          return e;
        });
        setLocalEntries(nextEntries);
      } else {
        setLocalEntries(prev => prev.filter(e => e.id !== masterId));
      }
      setEntryDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Deleted", description: "Entry removed." });
      return;
    }
  
    // Signed-in user deletion
    if (!firestore) return;
    const masterId = getOriginalIdFromInstance(id);
    const instanceDate = getInstanceDate(id);
    const docRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
  
    try {
      const snap = await getDoc(docRef);
      const masterEntry = snap.exists() ? (snap.data() as Entry) : entries.find(e => e.id === masterId);
  
      if (!snap.exists()) {
        setIgnoredMasterIds(prev => prev.includes(masterId) ? prev : [...prev, masterId]);
        toast({ title: "Cleaned up", description: "This entry was already removed. I’ve cleared the leftover instance." });
        setEntryDialogOpen(false);
        setEditingEntry(null);
        return;
      }
      
      if (instanceDate && masterEntry && masterEntry.recurrence !== 'none') {
        await updateDoc(docRef, {
          [`exceptions.${instanceDate}.movedFrom`]: true,
          updated_at: serverTimestamp(),
        });
      } else {
        await deleteDoc(docRef);
      }
  
      setEntryDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Deleted", description: "Entry removed." });
    } catch (err) {
      console.error("handleEntryDelete error:", err);
      toast({ title: "Delete failed", description: String(err), variant: "destructive" });
    }
  };
  
  const handleEntryCopy = (entryToCopy: Entry) => {
    setEditingEntry({ ...entryToCopy, id: '', isPaid: false });
    setEntryDialogOpen(true);
  };

  const openNewEntryDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };
  
   const openDayEntriesDialog = (holidays: Holiday[], birthdays: Birthday[]) => {
    setDayDialogHolidays(holidays);
    setDayDialogBirthdays(birthdays);
    setDayEntriesDialogOpen(true);
  };

  const allGeneratedEntries = useMemo(() => {
    if (entries.length === 0) return [];
    
    const viewStart = startOfMonth(subMonths(new Date(), 12));
    const viewEnd = endOfMonth(addMonths(new Date(), 24));

    const base = entries.flatMap((e) => generateRecurringInstances(e, viewStart, viewEnd, timezone));
    if (!ignoredMasterIds.length) return base;

    return base.filter(inst => {
      const masterId = getOriginalIdFromInstance(inst.id);
      return !ignoredMasterIds.includes(masterId);
    });
  }, [entries, timezone, ignoredMasterIds]);
  
  const budgetScore = useMemo(() => {
      return calculateBudgetScore(allGeneratedEntries);
  }, [allGeneratedEntries]);

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
          variant: 'destructive',
        });
      }
    }
    previousScoreRef.current = budgetScore.score;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasScoreForToday = budgetScores.some(s => s.date === todayStr);
    
    if (!hasScoreForToday) {
       const newScores = [...budgetScores, budgetScore].slice(-30); 
       setBudgetScores(newScores);
    } else {
      const todaysSavedScore = budgetScores.find(s => s.date === todayStr);
      if (todaysSavedScore && Math.abs(todaysSavedScore.score - budgetScore.score) > 2) {
           setBudgetScores(prevScores => {
              const updatedScores = prevScores.filter(s => s.date !== todayStr);
              return [...updatedScores, budgetScore];
          });
      }
    }
  }, [budgetScore, budgetScores, setBudgetScores, toast]);

    const handleSaveGoal = async (goalData: Omit<Goal, 'id'> & { id?: string }) => {
        if (user && firestore) {
            if (goalData.id) {
                await updateDoc(doc(firestore, 'users', user.uid, 'goals', goalData.id), { ...goalData, updated_at: serverTimestamp() });
            } else {
                await addDoc(collection(firestore, 'users', user.uid, 'goals'), { ...goalData, created_at: serverTimestamp(), updated_at: serverTimestamp() });
            }
        } else {
            setLocalGoals(prev => {
                if (goalData.id) {
                    return prev.map(g => g.id === goalData.id ? { ...g, ...goalData } : g);
                }
                return [...prev, { ...goalData, id: crypto.randomUUID() }];
            });
        }
    };

    const handleDeleteGoal = async (id: string) => {
       if (user && firestore) {
            await deleteDoc(doc(firestore, 'users', user.uid, 'goals', id));
        } else {
            setLocalGoals(prev => prev.filter(g => g.id !== id));
        }
    };

    const handleSaveBirthday = async (birthdayData: Omit<Birthday, 'id'> & { id?: string }) => {
        if (user && firestore) {
            if (birthdayData.id) {
                await updateDoc(doc(firestore, 'users', user.uid, 'birthdays', birthdayData.id), { ...birthdayData, updated_at: serverTimestamp() });
            } else {
                await addDoc(collection(firestore, 'users', user.uid, 'birthdays'), { ...birthdayData, created_at: serverTimestamp(), updated_at: serverTimestamp() });
            }
        } else {
            setLocalBirthdays(prev => {
                if (birthdayData.id) {
                    return prev.map(b => b.id === birthdayData.id ? { ...b, ...birthdayData } : b);
                }
                return [...prev, { ...birthdayData, id: crypto.randomUUID() }];
            });
        }
    };

    const handleDeleteBirthday = async (id: string) => {
        if (user && firestore) {
            await deleteDoc(doc(firestore, 'users', user.uid, 'birthdays', id));
        } else {
            setLocalBirthdays(prev => prev.filter(g => g.id !== id));
        }
    };

  useEffect(() => {
    if (allGeneratedEntries.length === 0) return;

    const newWeeklyBalances: WeeklyBalances = {};
    if (allGeneratedEntries.length > 0) {
        const sortedEntries = allGeneratedEntries.sort((a,b) => a.date.localeCompare(b.date));
        
        const firstDate = parseDateInTimezone(sortedEntries[0].date, timezone);
        const lastDate = parseDateInTimezone(sortedEntries[sortedEntries.length - 1].date, timezone);
        
        const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate });
        let lastWeekBalance = 0;

        weeks.forEach(weekStart => {
            const weekEnd = endOfWeek(weekStart);
            const weekKey = format(weekStart, 'yyyy-MM-dd');

            const entriesForWeek = allGeneratedEntries.filter(e => {
                const entryDate = parseDateInTimezone(e.date, timezone);
                return entryDate >= weekStart && entryDate <= weekEnd;
            });
            
            const income = entriesForWeek.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
            const bills = entriesForWeek.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
            
            let currentWeekStartBalance = lastWeekBalance;
            if (rollover === 'reset' && getDay(weekStart) === startOfWeek(new Date()).getDay() && weekStart.getDate() <= 7) {
            }

            const endOfWeekBalance = currentWeekStartBalance + income - bills;
            newWeeklyBalances[weekKey] = { start: currentWeekStartBalance, end: endOfWeekBalance };
            lastWeekBalance = endOfWeekBalance;
        });
    }
    
    if (JSON.stringify(newWeeklyBalances) !== JSON.stringify(weeklyBalances)) {
        setWeeklyBalances(newWeeklyBalances);
    }

  }, [allGeneratedEntries, timezone, rollover, setWeeklyBalances, weeklyBalances]);

  useEffect(() => {
    if (allGeneratedEntries.length === 0) return;

    const insights = getForecastInsights(allGeneratedEntries, goals);
    
    insights.forEach(insight => {
        const hasShown = sessionStorage.getItem(`insight_${insight.type}_${insight.details}`);
        if (!hasShown) {
             toast({
                title: insight.title,
                description: insight.description,
            });
            sessionStorage.setItem(`insight_${insight.type}_${insight.details}`, 'true');
        }
    })

  }, [allGeneratedEntries, goals, toast]);


  const { dayEntries, weeklyTotals, dojoRank, seasonalEvents, seasonalEventsNext30d } = useMemo(() => {
      setIsDataReady(false);
      const primaryGoal = goals.length > 0 ? goals[0] : null;
      const rank = getDojoRank(primaryGoal);

      if (!allGeneratedEntries.length) {
        setIsDataReady(true);
        return {
          dayEntries: [],
          weeklyTotals: { income: 0, bills: 0, net: 0, startOfWeekBalance: 0, status: 0 },
          dojoRank: rank,
          seasonalEvents: [],
          seasonalEventsNext30d: [],
        };
      }

      const dayEntries = allGeneratedEntries.filter((e) => isSameDay(parseDateInTimezone(e.date, timezone), selectedDate));
      
      const weekStart = startOfWeek(selectedDate);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      const weekBalanceInfo = weeklyBalances[weekKey];
      const startOfWeekBalance = weekBalanceInfo ? weekBalanceInfo.start : 0;
      const endOfWeekBalance = weekBalanceInfo ? weekBalanceInfo.end : 0;

      const weekEntries = allGeneratedEntries.filter(e => {
          const entryDate = parseDateInTimezone(e.date, timezone);
          return entryDate >= weekStart && entryDate <= endOfWeek(weekStart);
      });

      const weeklyIncome = weekEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const weeklyBills = weekEntries.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
      const weeklyStatus = weeklyIncome - weeklyBills;
      
      const allHolidays = getHolidaysForYear(new Date().getFullYear());
      const next30Days = {start: new Date(), end: add(new Date(), {days: 30})};
      
      const seasonalEventsNext30d: SeasonalEvent[] = [];
      allHolidays.forEach(h => {
        if(isWithinInterval(h.date, next30Days)) {
            seasonalEventsNext30d.push({date: format(h.date, 'yyyy-MM-dd'), name: h.name, expected_spend: 50})
        }
      });
      birthdays.forEach(b => {
        const [month, day] = b.date.split('-').map(Number);
        const bdayDate = set(new Date(), {month: month - 1, date: day});
        if(isWithinInterval(bdayDate, next30Days)) {
             seasonalEventsNext30d.push({date: format(bdayDate, 'yyyy-MM-dd'), name: b.name, expected_spend: b.budget || 50 })
        }
      });
      
      setIsDataReady(true);
      return {
        dayEntries,
        weeklyTotals: {
            income: weeklyIncome,
            bills: weeklyBills,
            net: endOfWeekBalance,
            startOfWeekBalance: startOfWeekBalance,
            status: weeklyStatus,
        },
        dojoRank: rank,
        seasonalEvents: seasonalEventsNext30d,
        seasonalEventsNext30d,
      }
  }, [selectedDate, allGeneratedEntries, timezone, weeklyBalances, birthdays, goals]);

  useEffect(() => {
    if (!dojoRank) return;

    if (previousDojoRankRef.current && previousDojoRankRef.current.level < dojoRank.level) {
       toast({
          title: "Dojo Promotion!",
          description: `The path of the Grasshoppa blossoms—${dojoRank.name} unlocked!`,
        });
        if (confettiRef.current) {
            confettiRef.current.addConfetti({
                confettiColors: [dojoRank.belt.color, '#FFFFFF', '#FBBF24'],
                confettiNumber: 100,
            });
        }
    }

    previousDojoRankRef.current = dojoRank;
  }, [dojoRank, toast]);

  if (authLoading) {
    return <CentseiLoader isAuthLoading={true} />;
  }

  if (!user && !isGuest) {
    return <CentseiLoader isAuthLoading={true} />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="flex h-20 items-center justify-between border-b px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2">
            <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} style={{ height: 'auto'}} />
        </div>
        <div className="flex items-center gap-2">
          {!isSelectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden md:flex">
                  Menu <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => openNewEntryDialog(new Date())}>
                  <Plus className="mr-2 h-4 w-4" /> Add Entry
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setScoreWidgetOpen(true)}>
                    <TrendingUp className="mr-2 h-4 w-4" /> Sensei's Evaluation
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setDojoWidgetOpen(true)}>
                    <Trophy className="mr-2 h-4 w-4" /> Dojo Journey
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setGoalsDialogOpen(true)}>
                    <Target className="mr-2 h-4 w-4" /> Zen Savings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => sensei.showFavorites()}>
                    <Heart className="mr-2 h-4 w-4" /> Favorite Mantras
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEnsoInsightsOpen(true)}>
                  <AreaChart className="mr-2 h-4 w-4" /> Enso Insights
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSummaryDialogOpen(true)}>
                  <BarChartBig className="mr-2 h-4 w-4" /> Monthly Summary
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setBreakdownDialogOpen(true)}>
                  <PieChart className="mr-2 h-4 w-4" /> Category Breakdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
           {isSelectionMode && selectedInstances.length > 0 && (
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkCompleteAlertOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete ({selectedInstances.length})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteAlertOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedInstances.length})
                </Button>
            </div>
           )}
          <Button onClick={() => setCalculatorDialogOpen(true)} variant="ghost" size="icon">
            <Calculator className="h-5 w-5" />
          </Button>
          <Button onClick={() => setSettingsDialogOpen(true)} variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                          <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           ) : isGuest ? (
            <Button onClick={() => router.push('/login')} variant="default" size="sm">
                Sign in to sync
            </Button>
           ) : null}


          {isMobile && (
            <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon"><Menu /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col bg-secondary/30">
                 <SheetHeader className="p-4 md:p-6 border-b shrink-0 bg-background">
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>
                        Weekly summary for {format(selectedDate, "MMM d, yyyy")}.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                   <div className="p-4 flex flex-col gap-2">
                     <Button onClick={() => { setScoreWidgetOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full justify-start">
                        <TrendingUp className="mr-2 h-4 w-4" /> Sensei's Evaluation
                    </Button>
                     <Button onClick={() => { setDojoWidgetOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full justify-start">
                        <Trophy className="mr-2 h-4 w-4" /> Dojo Journey
                    </Button>
                     <Button onClick={() => { setGoalsDialogOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full justify-start">
                        <Target className="mr-2 h-4 w-4" /> Zen Savings
                    </Button>
                     <Button onClick={() => { sensei.showFavorites(); setMobileSheetOpen(false); }} variant="outline" className="w-full justify-start">
                        <Heart className="mr-2 h-4 w-4" /> Favorite Mantras
                    </Button>
                  </div>
                  <Separator className="my-2" />
                  {isDataReady ? (
                    <SidebarContent
                        weeklyTotals={weeklyTotals}
                        selectedDate={selectedDate}
                    />
                  ) : <p className="p-4 text-center text-sm text-muted-foreground">Calculating...</p>}
                   <div className="p-4 flex flex-col gap-2 border-t">
                     <Button onClick={() => { setEnsoInsightsOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full">
                        <AreaChart className="mr-2 h-4 w-4" /> Enso Insights
                     </Button>
                     <Button onClick={() => { setSummaryDialogOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full">
                        <BarChartBig className="mr-2 h-4 w-4" /> Monthly Summary
                    </Button>
                     <Button onClick={() => { setBreakdownDialogOpen(true); setMobileSheetOpen(false); }} variant="outline" className="w-full">
                        <PieChart className="mr-2 h-4 w-4" /> Category Breakdown
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>
      
      {isDataReady ? (
        <>
            <CentseiCalendar 
                entries={entries}
                setEntries={user ? () => {} : setLocalEntries}
                generatedEntries={allGeneratedEntries}
                timezone={timezone}
                openNewEntryDialog={openNewEntryDialog}
                setEditingEntry={setEditingEntry}
                setSelectedDate={setSelectedDate}
                setEntryDialogOpen={setEntryDialogOpen}
                openDayEntriesDialog={openDayEntriesDialog}
                weeklyBalances={weeklyBalances}
                weeklyTotals={weeklyTotals}
                isSelectionMode={isSelectionMode}
                toggleSelectionMode={toggleSelectionMode}
                selectedInstances={selectedInstances}
                setSelectedInstances={setSelectedInstances}
                onBulkDelete={() => setBulkDeleteAlertOpen(true)}
                onMoveRequest={(entry, newDate) => setMoveOperation({ entry, newDate })}
                birthdays={birthdays}
            />
            <SenseiSaysUI 
                sensei={sensei}
                budgetScore={budgetScore}
                dojoRank={dojoRank}
                weeklyTotals={weeklyTotals}
                seasonalEvents={seasonalEventsNext30d}
                goals={goals}
            />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
            <CentseiLoader isAuthLoading={true} />
        </div>
      )}
      
      <EntryDialog 
        isOpen={isEntryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSave={handleEntrySave}
        onDelete={handleEntryDelete}
        onCopy={handleEntryCopy}
        entry={editingEntry}
        selectedDate={selectedDate}
        timezone={timezone}
      />
      
      <DayEntriesDialog
        isOpen={isDayEntriesDialogOpen}
        onClose={() => setDayEntriesDialogOpen(false)}
        date={selectedDate}
        entries={dayEntries}
        holidays={dayDialogHolidays}
        birthdays={dayDialogBirthdays}
        onAddEntry={() => {
            setDayEntriesDialogOpen(false);
            openNewEntryDialog(selectedDate);
        }}
        onEditEntry={(entry) => {
            setDayEntriesDialogOpen(false);
            setEditingEntry(entry);
            setEntryDialogOpen(true);
        }}
      />

       <MonthlyBreakdownDialog
        isOpen={isBreakdownDialogOpen}
        onClose={() => setBreakdownDialogOpen(false)}
        entries={allGeneratedEntries}
        currentMonth={selectedDate}
        timezone={timezone}
      />
      
       <MonthlySummaryDialog
        isOpen={isSummaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        allEntries={allGeneratedEntries}
        initialMonth={selectedDate}
        weeklyBalances={weeklyBalances}
        timezone={timezone}
      />

      <CalculatorDialog
        isOpen={isCalculatorDialogOpen}
        onClose={() => setCalculatorDialogOpen(false)}
      />
      
      <GoalsDialog
        isOpen={isGoalsDialogOpen}
        onClose={() => setGoalsDialogOpen(false)}
        goals={goals}
        onSaveGoal={handleSaveGoal}
        onDeleteGoal={handleDeleteGoal}
      />

      <BirthdaysDialog
        isOpen={isBirthdaysDialogOpen}
        onClose={() => setBirthdaysDialogOpen(false)}
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

      <SettingsDialog 
        isOpen={isSettingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        rolloverPreference={rollover}
        onRolloverPreferenceChange={setRollover}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        onNotificationsToggle={handleNotificationsToggle}
        onManageBirthdays={() => setBirthdaysDialogOpen(true)}
        entries={user ? entries : localEntries}
        onEntriesChange={setLocalEntries}
        goals={user ? goals : localGoals}
        onGoalsChange={setLocalGoals}
        birthdays={user ? birthdays : localBirthdays}
        onBirthdaysChange={setLocalBirthdays}
      />

       <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will remove the {selectedInstances.length} selected occurrence(s). For recurring entries, only the chosen occurrence(s) will be removed — the series remains intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isBulkCompleteAlertOpen} onOpenChange={setBulkCompleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Complete</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the {selectedInstances.length} selected entries as complete. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkMarkAsComplete}>
              Mark as Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={!!moveOperation} onOpenChange={(isOpen) => !isOpen && setMoveOperation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Move</AlertDialogTitle>
            <AlertDialogDescription>
                This will move this occurrence of the entry. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMoveOperation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BudgetScoreInfoDialog
        isOpen={isScoreInfoDialogOpen}
        onClose={() => setScoreInfoDialogOpen(false)}
      />

      <BudgetScoreHistoryDialog
        isOpen={isScoreHistoryDialogOpen}
        onClose={() => setScoreHistoryDialogOpen(false)}
        history={budgetScores}
      />
      
      <DojoJourneyInfoDialog
        isOpen={isDojoInfoDialogOpen}
        onClose={() => setDojoInfoDialogOpen(false)}
      />
      
      {budgetScore && (
        <Dialog open={isScoreWidgetOpen} onOpenChange={setScoreWidgetOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sensei's Evaluation</DialogTitle>
                    <DialogDescription>A snapshot of your financial health over the last 30 days.</DialogDescription>
                </DialogHeader>
                <BudgetScoreWidget score={budgetScore} onInfoClick={() => setScoreInfoDialogOpen(true)} onHistoryClick={() => setScoreHistoryDialogOpen(true)} />
            </DialogContent>
        </Dialog>
      )}

      {dojoRank && (
        <Dialog open={isDojoWidgetOpen} onOpenChange={setDojoWidgetOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dojo Journey</DialogTitle>
                    <DialogDescription>Track your progress toward financial mastery by growing your savings.</DialogDescription>
                </DialogHeader>
                <DojoJourneyWidget rank={dojoRank} onInfoClick={() => setDojoInfoDialogOpen(true)} />
            </DialogContent>
        </Dialog>
      )}

      {showMigrationDialog && user && (
          <MigrationDialog 
            isOpen={showMigrationDialog}
            onClose={() => {
                setShowMigrationDialog(false);
                exitGuest();
            }}
            localData={{ entries: localEntries, goals: localGoals, birthdays: localBirthdays }}
            user={user}
          />
      )}
    </div>
  );
}
