
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
import type { Entry, RolloverPreference, WeeklyBalances, SelectedInstance, BudgetScore, DojoRank, Goal, Birthday, Holiday, SeasonalEvent } from "@/lib/types";
import { CentseiCalendar, SidebarContent } from "./centsei-calendar";
import { format, subMonths, startOfMonth, endOfMonth, isBefore, getDate, setDate, startOfWeek, endOfWeek, eachWeekOfInterval, add, getDay, isSameDay, addMonths, isSameMonth, differenceInCalendarMonths, lastDayOfMonth, set, getYear, isWithinInterval, isAfter } from "date-fns";
import { toZonedTime } from "date-fns-tz";
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
import { BudgetScoreWidget } from "./budget-score-widget";
import { DojoJourneyWidget } from "./dojo-journey-widget";
import { Separator } from "./ui/separator";
import { getHolidaysForYear } from "@/lib/holidays";
import { getForecastInsights } from "@/lib/forecast-insights";
import SenseiSaysUI from "./sensei-says-ui";
import { useAuth } from './auth-provider';
import { CentseiLoader } from "./centsei-loader";
import useLocalStorage from "@/hooks/use-local-storage";
import { parseDateInTimezone, stripUndefined } from "@/lib/utils";
import { useSuppressContextMenu } from "@/hooks/use-suppress-contextmenu";

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
    const recurrenceEndDate = entry.recurrenceEndDate ? parseDateInTimezone(entry.recurrenceEndDate, timezone) : null;
    let occurrenceCount = 0;

    let currentDate = originalEntryDate;

    // Fast-forward logic for all recurrence types
    if (isBefore(currentDate, start)) {
        if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
            const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
            const diffWeeks = Math.floor(differenceInCalendarMonths(start, currentDate) * 4.345); // Approx weeks
            const numIntervals = Math.max(0, Math.floor(diffWeeks / weeksToAdd));
             if (numIntervals > 0) {
                currentDate = add(currentDate, { weeks: numIntervals * weeksToAdd });
                occurrenceCount += numIntervals;
            }
        } else {
             const recurrenceInterval = entry.recurrence ? (recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths] || 0) : 0;
            if (recurrenceInterval > 0) {
                const monthsDiff = differenceInCalendarMonths(start, currentDate);
                const numIntervals = Math.max(0, Math.floor(monthsDiff / recurrenceInterval));
                if (numIntervals > 0) {
                    currentDate = add(currentDate, { months: numIntervals * recurrenceInterval });
                    occurrenceCount += numIntervals;
                }
            }
        }
    }
     
    // Backtrack one step to ensure we don't miss the first valid date
    while (isBefore(currentDate, start)) {
        const weeksToAdd = entry.recurrence === 'weekly' ? 1 : (entry.recurrence === 'bi-weekly' ? 2 : 0);
        if (weeksToAdd > 0) {
            currentDate = add(currentDate, { weeks: weeksToAdd });
        } else {
            const monthsToAdd = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
            currentDate = add(currentDate, { months: monthsToAdd });
        }
        occurrenceCount++;
    }


    while (currentDate <= end) {
       if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) break;
       if (entry.recurrenceCount && occurrenceCount >= entry.recurrenceCount) break;

      if (currentDate >= start) {
        if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
            potentialDates.push(currentDate);
        } else {
            const originalDay = getDate(originalEntryDate);
            const lastDayInCurrentMonth = lastDayOfMonth(currentDate).getDate();
            const dayForMonth = Math.min(originalDay, lastDayInCurrentMonth);
            const finalDate = setDate(currentDate, dayForMonth);
            if (finalDate <= end && finalDate >= start && isSameMonth(finalDate, currentDate)) {
              potentialDates.push(finalDate);
            }
        }
      }
      
      if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
          const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
          currentDate = add(currentDate, { weeks: weeksToAdd });
      } else {
          const recurrenceInterval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
          if(recurrenceInterval) {
            currentDate = add(currentDate, { months: recurrenceInterval });
          } else {
            break;
          }
      }
      occurrenceCount++;
    }
  }

  potentialDates.forEach(date => {
    if (date >= start && date <= end) {
        const dateStr = format(date, 'yyyy-MM-dd');
        if (!instanceMap.has(dateStr)) {
          const instance = createInstance(date, entry.exceptions?.[dateStr]?.isPaid);
          instanceMap.set(dateStr, instance);
        }
    }
  });

  if (entry.exceptions) {
    Object.entries(entry.exceptions).forEach(([dateStr, exception]) => {
      if (!exception) return;
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
          instanceMap.set(dateStr, createInstance(exceptionDate, exception.isPaid));
        }
      }

      if (exception.movedTo) {
        const movedToDate = parseDateInTimezone(exception.movedTo, timezone);
        if (movedToDate >= start && movedToDate <= end && !instanceMap.has(exception.movedTo)) {
           instanceMap.set(exception.movedTo, createInstance(movedToDate, exception.isPaid));
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

export default function CentseiDashboard() {
  const { user, isGuest, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isCalendarRoute = pathname === "/" || pathname?.startsWith("/view");
  useSuppressContextMenu(rootRef, isCalendarRoute);

  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
        router.replace('/login');
    }
  }, [user, isGuest, authLoading, router]);

  const [entries, setEntries] = useLocalStorage<Entry[]>('centseiEntries', []);
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
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weeklyBalances, setWeeklyBalances] = useState<WeeklyBalances>({});
  
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<SelectedInstance[]>([]);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<{entry: Entry, newDate: string} | null>(null);


  const { toast } = useToast();
  const isMobile = useMedia("(max-width: 1024px)", false);
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const jsConfettiRef = useRef<JSConfetti | null>(null);

  const senseiSays = useSenseiSays({ user });

  // Use Firestore for data if user is logged in
  useEffect(() => {
    if (!user) {
        // If user logs out, the useLocalStorage hooks will take over.
        return;
    }
    const entriesQuery = query(collection(firestore, 'users', user.uid, 'calendar_entries'));
    const goalsQuery = query(collection(firestore, 'users', user.uid, 'goals'));
    const birthdaysQuery = query(collection(firestore, 'users', user.uid, 'birthdays'));
    
    const settingsDocRef = doc(firestore, 'users', user.uid);
    const unsubSettings = onSnapshot(settingsDocRef, (doc) => {
        const settings = doc.data()?.settings;
        if (settings) {
            if (settings.rolloverPreference) setRolloverPreference(settings.rolloverPreference);
            if (settings.timezone) setTimezone(settings.timezone);
            if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled);
        }
    });

    const unsubEntries = onSnapshot(entriesQuery, snapshot => {
        const cloudEntries = snapshot.docs.map(d => ({...d.data(), id: d.id } as Entry));
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
    
    const viewStart = startOfMonth(subMonths(currentMonth, 12));
    const viewEnd = endOfMonth(addMonths(currentMonth, 24));

    return entries.flatMap((e) => generateRecurringInstances(e, viewStart, viewEnd, timezone));
  }, [entries, currentMonth, timezone]);
  
  useEffect(() => {
    if (allGeneratedEntries.length === 0) {
        setWeeklyBalances({});
        return;
    }

    const newWeeklyBalances: WeeklyBalances = {};
    const sortedEntries = allGeneratedEntries.sort((a,b) => a.date.localeCompare(b.date));
        
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
            return entryDate >= weekStart && entryDate <= weekEnd;
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
  }, [allGeneratedEntries, rolloverPreference, timezone]);

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

  const handleSaveEntry = async (entryToSave: Omit<Entry, "id" | 'date'> & { id?: string; date: Date; originalDate?: string }) => {
    const { originalDate, ...data } = entryToSave;
    const masterId = data.id;
    const newDateStr = format(data.date, 'yyyy-MM-dd');

    const cleanData = stripUndefined(data);

    if (user && firestore) {
        if (!masterId) { // This is a new entry
            const collectionRef = collection(firestore, 'users', user.uid, 'calendar_entries');
            await addDoc(collectionRef, { ...cleanData, date: newDateStr, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        } else { // This is an existing entry (master or instance)
            const masterDocRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
            const masterDoc = await getDoc(masterDocRef);
            if (!masterDoc.exists()) return;

            const masterEntry = { id: masterDoc.id, ...masterDoc.data() } as Entry;

            if (masterEntry.recurrence === 'none') {
                 await updateDoc(masterDocRef, { ...cleanData, date: newDateStr, updated_at: serverTimestamp() });
            } else {
                const exceptions = masterEntry.exceptions || {};
                const oldDateStr = originalDate;

                // remove old exception if it exists
                if (oldDateStr && exceptions[oldDateStr]) {
                   delete exceptions[oldDateStr];
                }
                
                // Add new exception
                exceptions[newDateStr] = {
                    ...exceptions[newDateStr], // preserve other potential modifications
                    name: data.name,
                    amount: data.amount,
                    isPaid: data.isPaid,
                    category: data.category
                };

                // Add pointer if dates differ
                if (oldDateStr && oldDateStr !== newDateStr) {
                    exceptions[newDateStr].movedFrom = oldDateStr;
                    exceptions[oldDateStr] = { ...exceptions[oldDateStr], movedTo: newDateStr };
                }

                await updateDoc(masterDocRef, { exceptions, updated_at: serverTimestamp() });
            }
        }
    } else {
         setEntries(prevEntries => {
            if (!masterId) {
                return [...prevEntries, { ...cleanData, date: newDateStr, id: crypto.randomUUID() }];
            }

            const masterEntry = prevEntries.find(e => e.id === masterId);
            if (!masterEntry) return prevEntries;

            if (masterEntry.recurrence === 'none') {
                return prevEntries.map(e => e.id === masterId ? { ...e, ...cleanData, date: newDateStr } : e);
            }
            
            const exceptions = { ...masterEntry.exceptions };
            if (originalDate && exceptions[originalDate]) {
                delete exceptions[originalDate];
            }
            
            exceptions[newDateStr] = {
                ...exceptions[newDateStr],
                name: data.name, amount: data.amount, isPaid: data.isPaid, category: data.category
            };
            if(originalDate && originalDate !== newDateStr) {
                exceptions[newDateStr].movedFrom = originalDate;
                exceptions[originalDate] = { ...exceptions[originalDate], movedTo: newDateStr };
            }
            
            return prevEntries.map(e => e.id === masterId ? { ...e, exceptions } : e);
        });
    }

    if(notificationsEnabled) scheduleNotificationsLocal(entries, timezone, toast);
    toast({ title: 'Entry Saved', description: `Your ${data.type} has been saved.` });
    setEntryDialogOpen(false);
    setEditingEntry(null);
  };
  
  const handleCopyEntry = (entry: Entry) => {
    const copy = { ...entry, id: '', date: format(selectedDate, 'yyyy-MM-dd') };
    setEditingEntry(copy);
    setEntryDialogOpen(true);
  }

  const handleDeleteEntry = async (instanceId: string) => {
    const masterId = getOriginalIdFromInstance(instanceId);
    
    if (user && firestore) {
        const masterDocRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
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
    } else {
       setEntries(prevEntries => {
            const masterEntry = prevEntries.find(e => e.id === masterId);
            if (!masterEntry) return prevEntries;

            if (masterEntry.recurrence === 'none') {
                return prevEntries.filter(e => e.id !== masterId);
            } else {
                const instanceDate = instanceId.substring(masterId.length + 1);
                const exceptions = { ...masterEntry.exceptions };
                exceptions[instanceDate] = { ...exceptions[instanceDate], movedFrom: "deleted" };
                return prevEntries.map(e => e.id === masterId ? { ...e, exceptions } : e);
            }
        });
    }
    
    setEntryToDelete(null);
    setEntryDialogOpen(false);
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
                masterUpdates[instance.masterId] = { exceptions: { ...masterEntry.exceptions } };
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

  const handleMoveEntry = async (entryToMove: Entry, newDate: string) => {
    if (user) {
        const masterId = getOriginalIdFromInstance(entryToMove.id);
        const masterDocRef = doc(firestore, 'users', user.uid, 'calendar_entries', masterId);
        const masterDoc = await getDoc(masterDocRef);
        const masterEntry = masterDoc.data() as Entry;
        
        if (masterEntry.recurrence === 'none') {
            await updateDoc(masterDocRef, { date: newDate });
        } else {
            const exceptions = { ...masterEntry.exceptions };
            const oldDate = entryToMove.date;
            
            exceptions[oldDate] = { ...exceptions[oldDate], movedTo: newDate };
            exceptions[newDate] = { ...exceptions[newDate], movedFrom: oldDate };

            await updateDoc(masterDocRef, { exceptions });
        }
    } else {
        setEntries(prevEntries => {
            const masterId = getOriginalIdFromInstance(entryToMove.id);
            return prevEntries.map(e => {
                if (e.id === masterId) {
                    if (e.recurrence === 'none') {
                        return { ...e, date: newDate };
                    } else {
                        const exceptions = { ...e.exceptions };
                        const oldDate = entryToMove.date;
                        exceptions[oldDate] = { ...exceptions[oldDate], movedTo: newDate };
                        exceptions[newDate] = { ...exceptions[newDate], movedFrom: oldDate };
                        return { ...e, exceptions };
                    }
                }
                return e;
            });
        });
    }
     
    setMoveRequest(null);
    toast({ title: 'Entry Moved', description: `Moved to ${format(parseDateInTimezone(newDate, timezone), 'MMM d, yyyy')}` });
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


  const openNewEntryDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };
  
  const openDayEntriesDialog = (holidays: Holiday[], dayBirthdays: Birthday[]) => {
    const dayEntries = allGeneratedEntries.filter(entry => isSameDay(parseDateInTimezone(entry.date, timezone), selectedDate));
    
    // Memoize this?
    const dayData = {
        date: selectedDate,
        entries: dayEntries,
        holidays: holidays,
        birthdays: dayBirthdays
    };

    if (dayEntries.length > 0 || holidays.length > 0 || dayBirthdays.length > 0) {
      setDayEntriesDialogOpen(true);
    } else {
      openNewEntryDialog(selectedDate);
    }
  };

  const handleEditFromDayDialog = (entry: Entry) => {
    setDayEntriesDialogOpen(false);
    const originalEntryId = getOriginalIdFromInstance(entry.id);
    const originalEntry = entries.find(e => e.id === originalEntryId) || entry;
    const instanceWithDate = { ...originalEntry, date: entry.date, id: entry.id };
    setEditingEntry(instanceWithDate);
    setEntryDialogOpen(true);
  };
  
  const handleAddFromDayDialog = () => {
    setDayEntriesDialogOpen(false);
    openNewEntryDialog(selectedDate);
  }

  const weeklyTotals = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
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

    return {
        income: weeklyIncome,
        bills: weeklyBills,
        net: endOfWeekBalance,
        startOfWeekBalance: startOfWeekBalance,
        status: weeklyIncome - weeklyBills,
    };
  }, [allGeneratedEntries, selectedDate, weeklyBalances, timezone]);
  
  const budgetScore = useMemo(() => {
      if (allGeneratedEntries.length === 0) return null;
      return calculateBudgetScore(allGeneratedEntries);
  }, [allGeneratedEntries]);

  const dojoRank = useMemo(() => {
    const primaryGoal = goals.length > 0 ? goals[0] : null;
    return getDojoRank(primaryGoal);
  }, [goals]);
  
  const seasonalEvents = useMemo(() => {
    const now = new Date();
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
  }, [birthdays]);
  

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


  if (authLoading || (!user && !isGuest)) {
    return <CentseiLoader isAuthLoading />;
  }
  
  if (!authLoading && !user && isGuest) {
      // Potentially show a "continue as guest" splash screen before rendering dashboard
  }

  return (
    <>
      <div ref={rootRef} className="flex h-screen w-full flex-col bg-background no-callout">
        <header className="flex h-20 items-center justify-between border-b px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Menu className="mr-2 h-4 w-4" /> Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEnsoInsightsOpen(true)}><AreaChart className="mr-2 h-4 w-4" />Enso's Insights</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGoalsOpen(true)}><Target className="mr-2 h-4 w-4" />Zen Goals</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMonthlySummaryOpen(true)}><PieChart className="mr-2 h-4 w-4" />Monthly Summary</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMonthlyBreakdownOpen(true)}><BarChartBig className="mr-2 h-4 w-4" />Category Breakdown</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setScoreInfoOpen(true)}><TrendingUp className="mr-2 h-4 w-4" />Sensei's Evaluation</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDojoInfoOpen(true)}><Trophy className="mr-2 h-4 w-4" />Dojo Journey</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => senseiSays.showFavorites()}><Heart className="mr-2 h-4 w-4" />Favorite Mantras</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                {isMobile && (
                  <>
                    <DropdownMenuItem onClick={() => setEnsoInsightsOpen(true)}><AreaChart className="mr-2 h-4 w-4" />Enso's Insights</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGoalsOpen(true)}><Target className="mr-2 h-4 w-4" />Zen Goals</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMonthlySummaryOpen(true)}><PieChart className="mr-2 h-4 w-4" />Monthly Summary</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMonthlyBreakdownOpen(true)}><BarChartBig className="mr-2 h-4 w-4" />Category Breakdown</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setScoreInfoOpen(true)}><TrendingUp className="mr-2 h-4 w-4" />Sensei's Evaluation</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDojoInfoOpen(true)}><Trophy className="mr-2 h-4 w-4" />Dojo Journey</DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setCalculatorOpen(true)}><Calculator className="mr-2 h-4 w-4" />Calculator</DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}><Settings className="mr-2 h-4 w-4"/>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                 <DropdownMenuItem onClick={() => senseiSays.showFavorites()}><Heart className="mr-2 h-4 w-4" />Favorite Mantras</DropdownMenuItem>
                 <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <CentseiCalendar
          entries={entries}
          generatedEntries={allGeneratedEntries}
          setEntries={setEntries}
          timezone={timezone}
          openNewEntryDialog={openNewEntryDialog}
          setEditingEntry={setEditingEntry}
          setSelectedDate={setSelectedDate}
          setEntryDialogOpen={setEntryDialogOpen}
          openDayEntriesDialog={openDayEntriesDialog}
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
          onMoveRequest={(entry, newDate) => setMoveRequest({entry, newDate})}
          birthdays={birthdays}
        />
        
        {isMobile && (
          <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
               <Button className="fixed bottom-4 left-4 rounded-full h-14 w-14 shadow-lg lg:hidden" variant="default" size="icon">
                  <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0 flex flex-col h-3/4">
               <SheetHeader className="p-4 border-b">
                 <SheetTitle>Week of {format(startOfWeek(selectedDate), "MMM d")}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1">
                  <SidebarContent
                    weeklyTotals={weeklyTotals}
                    selectedDate={selectedDate}
                  />
                  <Separator className="my-4" />
                  <div className="px-4 pb-4 space-y-4">
                     {budgetScore && (
                        <BudgetScoreWidget score={budgetScore} onInfoClick={() => setScoreInfoOpen(true)} onHistoryClick={() => setScoreHistoryOpen(true)} />
                     )}
                      <DojoJourneyWidget rank={dojoRank} onInfoClick={() => setDojoInfoOpen(true)} />
                  </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <EntryDialog
        isOpen={isEntryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSave={handleSaveEntry}
        onCopy={handleCopyEntry}
        onDelete={handleDeleteEntry}
        entry={editingEntry}
        selectedDate={selectedDate}
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
       <DayEntriesDialog
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
      />
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

       <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this specific entry. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => entryToDelete && handleDeleteEntry(entryToDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!moveRequest} onOpenChange={() => setMoveRequest(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Move Entry</AlertDialogTitle>
                <AlertDialogDescription>
                    How would you like to move this recurring entry?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
               <Button className="w-full" onClick={() => moveRequest && handleMoveEntry(moveRequest.entry, moveRequest.newDate)}>Just This One</Button>
               <Button className="w-full" variant="outline" onClick={() => setMoveRequest(null)}>Cancel</Button>
            </div>
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

    
