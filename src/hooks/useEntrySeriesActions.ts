
"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import type { Entry, MasterEntry } from "@/lib/types";
import { stripUndefined } from "@/lib/utils";
import { parseDateInTimezone } from "@/lib/time";
import { moveOneTime, moveSeries, moveSingleOccurrence, validateMaster, updateSingleOccurrence } from "@/lib/move";
import { ensurePersonalCalendar } from "@/lib/calendars";
import { useCalendar } from "@/contexts/CalendarContext";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

type Params = {
  user: any;
  firestore: any;
  calendarId: string;
  entries: MasterEntry[];
  setEntries: Setter<MasterEntry[]>;
  timezone: string;
  toast: (args: { title?: string; description?: string; variant?: string }) => void;
  setMoveRequest: Setter<{ entry: Entry; newDate: string } | null>;
};

export function useEntrySeriesActions({
  user,
  firestore,
  calendarId,
  entries,
  setEntries,
  timezone,
  toast,
  setMoveRequest,
}: Params) {
    const { setCalendarId } = useCalendar();

  function getOriginalIdFromInstance(key: string) {
    const m = key.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[1] : key;
  }
  const handleMoveEntry = useCallback(
    async (entryToMove: Entry, newDate: string, moveAll: boolean) => {
      const masterId = getOriginalIdFromInstance(entryToMove.id);
      const masterEntry = entries.find((e) => e.id === masterId);
      if (!masterEntry) return;

      let updatedEntry: MasterEntry;
      if (masterEntry.recurrence === "none") {
        updatedEntry = moveOneTime(masterEntry, entryToMove.date, newDate);
      } else if (moveAll) {
        updatedEntry = moveSeries(masterEntry, newDate);
      } else {
        updatedEntry = moveSingleOccurrence(masterEntry, entryToMove.date, newDate);
      }

      validateMaster(updatedEntry);

      if (user && firestore) {
        let calId = calendarId;
        if (!calId) {
          try { calId = await ensurePersonalCalendar(firestore, user.uid); setCalendarId(calId) } catch {}
        }
        if (!calId) { setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e))); setMoveRequest(null); toast({ title: "Entry Moved (Local)", description: `Moved to ${format(parseDateInTimezone(newDate, timezone), 'MMM d, yyyy')}` }); return; }
        const docRef = doc(firestore, 'calendars', calId, 'calendar_entries', masterId);
        await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
      } else {
        setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e)));
      }

      setMoveRequest(null);
      toast({ title: "Entry Moved", description: `Moved to ${format(parseDateInTimezone(newDate, timezone), 'MMM d, yyyy')}` });
    },
    [entries, firestore, setEntries, setMoveRequest, timezone, toast, user, calendarId, setCalendarId]
  );

  const handleInstancePaidToggle = useCallback(
    async (instanceId: string, isPaid: boolean) => {
      const masterId = getOriginalIdFromInstance(instanceId);
      const masterEntry = entries.find((e) => e.id === masterId);
      if (!masterEntry) return;

      const instanceDate = instanceId.substring(masterId.length + 1);
      const updatedEntry = updateSingleOccurrence(masterEntry, instanceDate, { isPaid });

      if (user && firestore) {
        let calId = calendarId;
        if (!calId) {
          try { calId = await ensurePersonalCalendar(firestore, user.uid); setCalendarId(calId); } catch {}
        }
        if (!calId) { setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e))); return; }
        const docRef = doc(firestore, 'calendars', calId, 'calendar_entries', masterId);
        await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
      } else {
        setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e)));
      }
    },
    [entries, firestore, setEntries, user, calendarId, setCalendarId]
  );

  const handleReorder = useCallback(
    async (orderedEntries: Entry[]) => {
      const masterUpdates = new Map<string, MasterEntry>();

      orderedEntries.forEach((entry, index) => {
        const masterId = getOriginalIdFromInstance(entry.id);
        const masterEntry = masterUpdates.get(masterId) || entries.find((e) => e.id === masterId);
        if (!masterEntry) return;

        const updatedMaster: any = { ...masterEntry, exceptions: { ...(masterEntry.exceptions || {}) } };
        updatedMaster.exceptions[entry.date] = {
          ...updatedMaster.exceptions[entry.date],
          order: index,
        };
        masterUpdates.set(masterId, stripUndefined(updatedMaster));
      });

      if (user && firestore) {
        let calId = calendarId;
        if (!calId) {
          try { calId = await ensurePersonalCalendar(firestore, user.uid); setCalendarId(calId); } catch {}
        }
        if (!calId) {
          setEntries((prevEntries) => prevEntries.map((e) => (masterUpdates.get(e.id) as any) || e));
        } else {
          const batch = writeBatch(firestore);
          masterUpdates.forEach((updatedMaster, id) => {
            const docRef = doc(firestore, 'calendars', calId!, 'calendar_entries', id);
            batch.update(docRef, { exceptions: (updatedMaster as any).exceptions });
          });
          await batch.commit();
        }
      } else {
        setEntries((prevEntries) => prevEntries.map((e) => (masterUpdates.get(e.id) as any) || e));
      }

      toast({ title: "Order Saved", description: "Your new entry order has been saved." });
    },
    [entries, firestore, setEntries, toast, user, calendarId, setCalendarId]
  );

  return { handleMoveEntry, handleInstancePaidToggle, handleReorder };
}
