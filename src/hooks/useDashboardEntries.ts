"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { Entry, MasterEntry } from "@/lib/types";
import { stripUndefined } from "@/lib/utils";
import { getOriginalIdFromInstance } from "@/lib/entries";
import { moveOneTime, moveSeries, moveSingleOccurrence, validateMaster, updateSeries, updateSingleOccurrence } from "@/lib/move";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

type Params = {
  user: any;
  firestore: any;
  entries: MasterEntry[];
  setEntries: Setter<MasterEntry[]>;
  notificationsEnabled: boolean;
  timezone: string;
  toast: (args: { title?: string; description?: string; variant?: string }) => void;
  setEntryDialogOpen: (open: boolean) => void;
  setEditingEntry: (entry: Entry | null) => void;
  selectedDate: Date | null;
  updateRequest: { entry: Omit<Entry, "id" | "date"> & { id?: string; date: Date; originalDate?: string }; isSeries: boolean } | null;
  setUpdateRequest: Setter<{ entry: Omit<Entry, "id" | "date"> & { id?: string; date: Date; originalDate?: string }; isSeries: boolean } | null>;
};

export function useDashboardEntries({
  user,
  firestore,
  entries,
  setEntries,
  notificationsEnabled,
  timezone,
  toast,
  setEntryDialogOpen,
  setEditingEntry,
  selectedDate,
  updateRequest,
  setUpdateRequest,
}: Params) {
  const handleSaveEntry = useCallback(
    async (
      entryToSave: Omit<Entry, "id" | "date"> & { id?: string; date: Date; originalDate?: string },
      isSeriesUpdate = false
    ) => {
      const { originalDate, ...data } = entryToSave as any;
      const masterId = data.id ? getOriginalIdFromInstance(data.id) : undefined;
      const masterEntry = masterId ? entries.find((e) => e.id === masterId) : undefined;

      if (masterEntry && masterEntry.recurrence !== "none" && !isSeriesUpdate && !updateRequest) {
        setUpdateRequest({ entry: entryToSave as any, isSeries: false });
        return;
      }

      setUpdateRequest(null);

      const saveData: any = { ...data };
      if (saveData.date) saveData.date = format(saveData.date, "yyyy-MM-dd");
      if (saveData.recurrenceEndDate) saveData.recurrenceEndDate = format(saveData.recurrenceEndDate, "yyyy-MM-dd");

      if (masterId && masterEntry) {
        let updatedEntry: MasterEntry;
        if (isSeriesUpdate) {
          updatedEntry = updateSeries(masterEntry, saveData);
        } else {
          updatedEntry = updateSingleOccurrence(masterEntry, originalDate || saveData.date, saveData);
        }

        if (user) {
          await updateDoc(
            doc(firestore, "users", user.uid, "calendar_entries", masterId),
            stripUndefined({ ...updatedEntry, id: undefined, updated_at: serverTimestamp() })
          );
        } else {
          setEntries((prev) => prev.map((e) => (e.id === masterId ? updatedEntry : e)));
        }
      } else {
        const newEntryData = { ...saveData, created_at: serverTimestamp(), updated_at: serverTimestamp() };
        if (user) {
          await addDoc(collection(firestore, "users", user.uid, "calendar_entries"), stripUndefined(newEntryData));
        } else {
          setEntries((prev) => [...prev, { ...newEntryData, id: crypto.randomUUID() } as any]);
        }
      }

      if (notificationsEnabled) {
        // Note: original code schedules notifications with full entries list; keep same behavior at caller if needed
      }
      toast({ title: "Entry Saved", description: `Your ${saveData.type} has been saved.` });
      setEntryDialogOpen(false);
      setEditingEntry(null);
    },
    [entries, firestore, notificationsEnabled, setEditingEntry, setEntries, setEntryDialogOpen, setUpdateRequest, toast, updateRequest, user]
  );

  const handleCopyEntry = useCallback(
    (entry: Entry) => {
      if (!selectedDate) return;
      const copy = { ...entry, id: "", date: format(selectedDate, "yyyy-MM-dd") } as Entry;
      setEditingEntry(copy);
      setEntryDialogOpen(true);
    },
    [selectedDate, setEditingEntry, setEntryDialogOpen]
  );

  const handleDeleteEntry = useCallback(
    async (instanceId: string | null, isSeriesDelete: boolean) => {
      if (!instanceId) return;
      const masterId = getOriginalIdFromInstance(instanceId);

      if (user && firestore) {
        const masterDocRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
        if (isSeriesDelete) {
          await deleteDoc(masterDocRef);
        } else {
          const masterDoc = await getDoc(masterDocRef);
          if (!masterDoc.exists()) return;
          const masterEntry = masterDoc.data() as Entry;

          if (masterEntry.recurrence === "none") {
            await deleteDoc(masterDocRef);
          } else {
            const instanceDate = instanceId.substring(masterId.length + 1);
            const exceptions = { ...masterEntry.exceptions };
            (exceptions as any)[instanceDate] = { ...(exceptions as any)[instanceDate], movedFrom: "deleted" };
            await updateDoc(masterDocRef, { exceptions });
          }
        }
      } else {
        setEntries((prevEntries) => {
          if (isSeriesDelete) {
            return prevEntries.filter((e) => e.id !== masterId);
          }

          const masterEntry = prevEntries.find((e) => e.id === masterId);
          if (!masterEntry) return prevEntries;

          if (masterEntry.recurrence === "none") {
            return prevEntries.filter((e) => e.id !== masterId);
          } else {
            const instanceDate = instanceId.substring(masterId.length + 1);
            const exceptions = { ...masterEntry.exceptions } as any;
            exceptions[instanceDate] = { ...exceptions[instanceDate], movedFrom: "deleted" };
            return prevEntries.map((e) => (e.id === masterId ? ({ ...e, exceptions } as any) : e));
          }
        });
      }
    },
    [firestore, setEntries, user]
  );

  return { handleSaveEntry, handleCopyEntry, handleDeleteEntry };
}

