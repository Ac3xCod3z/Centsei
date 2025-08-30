"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { parseDateInTimezone, stripUndefined } from "@/lib/utils";
import {
  writeBatch,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Entry, SelectedInstance } from "@/lib/types";
import { getOriginalIdFromInstance } from "@/lib/entries";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

type UseSelectionActionsParams = {
  user: any;
  firestore: any;
  entries: Entry[];
  setLocalEntries: Setter<Entry[]>;
  setIgnoredMasterIds: Setter<string[]>;
  toast: (args: { title?: string; description?: string; variant?: string }) => void;
  timezone: string;
};

export function useSelectionActions({
  user,
  firestore,
  entries,
  setLocalEntries,
  setIgnoredMasterIds,
  toast,
  timezone,
}: UseSelectionActionsParams) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<SelectedInstance[]>([]);
  const [isBulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false);
  const [isBulkCompleteAlertOpen, setBulkCompleteAlertOpen] = useState(false);
  const [moveOperation, setMoveOperation] = useState<{ entry: Entry; newDate: string } | null>(null);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedInstances([]);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedInstances.length === 0 || !user || !firestore) return;
    try {
      const batch = writeBatch(firestore);
      const newlyIgnored: string[] = [];

      for (const instance of selectedInstances) {
        const masterId = getOriginalIdFromInstance(instance.instanceId);
        const docRef = doc(firestore, "users", user.uid, "calendar_entries", masterId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          if (!newlyIgnored.includes(masterId)) newlyIgnored.push(masterId);
          continue;
        }
        const masterEntry = snap.data() as Entry;
        if (masterEntry?.recurrence === "none") {
          batch.delete(docRef);
        } else {
          batch.update(docRef, { [`exceptions.${instance.date}.movedFrom`]: true });
        }
      }

      if (newlyIgnored.length) {
        setIgnoredMasterIds((prev) => [...new Set([...prev, ...newlyIgnored])]);
      }
      await batch.commit();
      toggleSelectionMode();
      setBulkDeleteAlertOpen(false);
      toast({ title: `${selectedInstances.length} entries deleted.` });
    } catch (err: any) {
      console.error("handleBulkDelete error:", err);
      toast({ title: "Bulk delete failed", description: String(err), variant: "destructive" });
    }
  }, [selectedInstances, user, firestore, setIgnoredMasterIds, toggleSelectionMode, toast]);

  const handleConfirmMove = useCallback(async () => {
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

        await updateDoc(
          docRef,
          stripUndefined({
            [`exceptions.${originalDateStr}.movedFrom`]: true,
            [`exceptions.${newDate}`]: newException,
            updated_at: serverTimestamp(),
          })
        );
      }

      setMoveOperation(null);
      toast({
        title: "Entry moved",
        description: `Moved "${movedEntry.name}" to ${format(parseDateInTimezone(newDate, timezone), "PPP")}.`,
      });
    } catch (err: any) {
      console.error("handleConfirmMove error:", err);
      toast({ title: "Move failed", description: String(err), variant: "destructive" });
    }
  }, [moveOperation, user, firestore, entries, timezone, toast]);

  const handleBulkMarkAsComplete = useCallback(async () => {
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
                updated[idx] = { ...m, exceptions: ex } as Entry;
              } else {
                updated[idx] = { ...m, isPaid: true } as Entry;
              }
            }
          });
          return updated;
        });
      }

      setBulkCompleteAlertOpen(false);
      toast({ title: `${selectedInstances.length} entries marked as complete.` });
      toggleSelectionMode();
    } catch (err: any) {
      console.error("handleBulkMarkAsComplete error:", err);
      toast({ title: "Bulk complete failed", description: String(err), variant: "destructive" });
    }
  }, [selectedInstances, user, firestore, setLocalEntries, toast, toggleSelectionMode]);

  return {
    // state
    isSelectionMode,
    selectedInstances,
    isBulkDeleteAlertOpen,
    isBulkCompleteAlertOpen,
    moveOperation,
    // setters
    setSelectedInstances,
    setBulkDeleteAlertOpen,
    setBulkCompleteAlertOpen,
    setMoveOperation,
    // actions
    toggleSelectionMode,
    handleBulkDelete,
    handleConfirmMove,
    handleBulkMarkAsComplete,
  };
}

