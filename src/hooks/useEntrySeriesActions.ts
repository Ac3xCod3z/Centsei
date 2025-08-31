"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import type { Entry, MasterEntry } from "@/lib/types";
import { getOriginalIdFromInstance } from "@/lib/entries";
import { parseDateInTimezone, stripUndefined } from "@/lib/utils";
import { moveOneTime, moveSeries, moveSingleOccurrence, validateMaster, updateSingleOccurrence } from "@/lib/move";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

type Params = {
  user: any;
  firestore: any;
  entries: MasterEntry[];
  setEntries: Setter<MasterEntry[]>;
  timezone: string;
  toast: (args: { title?: string; description?: string; variant?: string }) => void;
  setMoveRequest: Setter<{ entry: Entry; newDate: string } | null>;
};

export function useEntrySeriesActions({
  user,
  firestore,
  entries,
  setEntries,
  timezone,
  toast,
  setMoveRequest,
}: Params) {
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
        const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
        await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
      } else {
        setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e)));
      }

      setMoveRequest(null);
      toast({ title: "Entry Moved", description: `Moved to ${format(parseDateInTimezone(newDate, timezone), 'MMM d, yyyy')}` });
    },
    [entries, firestore, setEntries, setMoveRequest, timezone, toast, user]
  );

  const handleInstancePaidToggle = useCallback(
    async (instanceId: string, isPaid: boolean) => {
      const masterId = getOriginalIdFromInstance(instanceId);
      const masterEntry = entries.find((e) => e.id === masterId);
      if (!masterEntry) return;

      const instanceDate = instanceId.substring(masterId.length + 1);
      const updatedEntry = updateSingleOccurrence(masterEntry, instanceDate, { isPaid });

      if (user && firestore) {
        const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
        await updateDoc(docRef, stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() }));
      } else {
        setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e)));
      }
    },
    [entries, firestore, setEntries, user]
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
        const batch = writeBatch(firestore);
        masterUpdates.forEach((updatedMaster, id) => {
          const docRef = doc(firestore, "users", user.uid, "calendar_entries", id);
          batch.update(docRef, { exceptions: (updatedMaster as any).exceptions });
        });
        await batch.commit();
      } else {
        setEntries((prevEntries) => prevEntries.map((e) => (masterUpdates.get(e.id) as any) || e));
      }

      toast({ title: "Order Saved", description: "Your new entry order has been saved." });
    },
    [entries, firestore, setEntries, toast, user]
  );

  return { handleMoveEntry, handleInstancePaidToggle, handleReorder };
}

