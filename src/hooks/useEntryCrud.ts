"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  collection,
  getDoc,
} from "firebase/firestore";
import type { Entry } from "@/lib/types";
import { getOriginalIdFromInstance, getInstanceDate } from "@/lib/entries";
import { stripUndefined } from "@/lib/utils";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

type UseEntryCrudParams = {
  user: any;
  firestore: any;
  entries: Entry[];
  localEntries: Entry[];
  setLocalEntries: Setter<Entry[]>;
  setEntryDialogOpen: (open: boolean) => void;
  setEditingEntry: (entry: Entry | null) => void;
  setIgnoredMasterIds: Setter<string[]>;
  toast: (args: { title?: string; description?: string; variant?: string }) => void;
};

export function useEntryCrud({
  user,
  firestore,
  entries,
  localEntries,
  setLocalEntries,
  setEntryDialogOpen,
  setEditingEntry,
  setIgnoredMasterIds,
  toast,
}: UseEntryCrudParams) {
  const handleEntrySave = useCallback(
    async (
      entryData: Omit<Entry, "id" | "date"> & {
        id?: string;
        date: Date;
        originalDate?: string;
      }
    ) => {
      if (!firestore) {
        toast({
          title: "Connection Error",
          description: "Cannot save entry, not connected to the database.",
          variant: "destructive",
        });
        return;
      }

      const formattedDate = format(entryData.date, "yyyy-MM-dd");
      const { id, date, ...restOfData } = entryData as any;
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
              [`${exPath}.isPaid`]: (entryData as any).isPaid,
              [`${exPath}.name`]: (entryData as any).name,
              [`${exPath}.amount`]: (entryData as any).amount,
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
        } else if (user) {
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
            setLocalEntries((prev) =>
              prev.map((e) => (e.id === masterId ? { ...e, ...cleanedData, date: formattedDate } : e))
            );
          } else {
            setLocalEntries((prev) => [
              ...prev,
              { ...cleanedData, id: (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36), date: formattedDate },
            ]);
          }
        }
      } catch (err: any) {
        console.error("handleEntrySave error:", err);
        toast({ title: "Save failed", description: String(err), variant: "destructive" });
      }
    },
    [firestore, toast, user, entries, setLocalEntries]
  );

  const handleEntryDelete = useCallback(
    async (id: string) => {
      if (!user) {
        const masterId = getOriginalIdFromInstance(id);
        const instanceDate = getInstanceDate(id);
        const masterEntry = localEntries.find((e) => e.id === masterId);

        if (instanceDate && masterEntry && masterEntry.recurrence !== "none") {
          const nextEntries = localEntries.map((e) => {
            if (e.id === masterId) {
              return {
                ...e,
                exceptions: {
                  ...e.exceptions,
                  [instanceDate]: { ...e.exceptions?.[instanceDate], movedFrom: true },
                },
              } as Entry;
            }
            return e;
          });
          setLocalEntries(nextEntries);
        } else {
          setLocalEntries((prev) => prev.filter((e) => e.id !== masterId));
        }
        setEntryDialogOpen(false);
        setEditingEntry(null);
        toast({ title: "Deleted", description: "Entry removed." });
        return;
      }

      if (!firestore) return;
      const masterId = getOriginalIdFromInstance(id);
      const instanceDate = getInstanceDate(id);
      const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);

      try {
        const snap = await getDoc(docRef);
        const masterEntry = snap.exists() ? (snap.data() as Entry) : entries.find((e) => e.id === masterId);

        if (!snap.exists()) {
          setIgnoredMasterIds((prev) => (prev.includes(masterId) ? prev : [...prev, masterId]));
          toast({ title: "Cleaned up", description: "This entry was already removed. I’ve cleared the leftover instance." });
          setEntryDialogOpen(false);
          setEditingEntry(null);
          return;
        }

        if (instanceDate && masterEntry && masterEntry.recurrence !== "none") {
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
      } catch (err: any) {
        console.error("handleEntryDelete error:", err);
        toast({ title: "Delete failed", description: String(err), variant: "destructive" });
      }
    },
    [user, firestore, localEntries, setLocalEntries, entries, setIgnoredMasterIds, toast, setEntryDialogOpen, setEditingEntry]
  );

  const handleEntryCopy = useCallback(
    (entryToCopy: Entry) => {
      setEditingEntry({ ...entryToCopy, id: "", isPaid: false });
      setEntryDialogOpen(true);
    },
    [setEditingEntry, setEntryDialogOpen]
  );

  return { handleEntrySave, handleEntryDelete, handleEntryCopy };
}

