// src/lib/move.ts
import type { MasterEntry, ISODate, EntryException } from './types';
import { stripUndefined } from './utils';

/**
 * Moves a non-recurring (one-time) entry by changing its primary date.
 */
export function moveOneTime(
  master: MasterEntry,
  from: ISODate,
  to: ISODate
): MasterEntry {
  if (from === to || master.recurrence !== 'none') {
    return master;
  }
  // For a one-time entry, we just change its date.
  const newMaster = { ...master, date: to };
  return newMaster;
}

/**
 * Moves a single occurrence of a recurring entry by creating exceptions.
 */
export function moveSingleOccurrence(
  master: MasterEntry,
  source: ISODate,
  target: ISODate
): MasterEntry {
  if (source === target) return master;
  
  const newMaster = { ...master, exceptions: { ...(master.exceptions ?? {}) } };
  
  // Find the original base date for this instance. If we are dragging an already moved instance,
  // its `movedFrom` tells us the original date in the series.
  const originalSourceDate = newMaster.exceptions[source]?.movedFrom ?? source;

  // Clean up any pre-existing move for the original source date.
  // This handles re-dragging a moved instance.
  const oldTarget = newMaster.exceptions[originalSourceDate]?.movedTo;
  if (oldTarget && oldTarget !== target) {
      delete newMaster.exceptions[oldTarget];
  }

  // Point the original date to the new target.
  newMaster.exceptions[originalSourceDate] = { movedTo: target };

  // Create the new exception at the target date.
  // For now, we don't copy overrides, but this could be extended.
  newMaster.exceptions[target] = { movedFrom: originalSourceDate };

  return stripUndefined(newMaster);
}


/**
 * Moves an entire recurring series by changing its anchor date and cleaning up exceptions.
 */
export function moveSeries(
  master: MasterEntry,
  newAnchorDate: ISODate
): MasterEntry {
  const newMaster = { ...master, date: newAnchorDate, exceptions: { ...(master.exceptions ?? {}) } };
  
  // Clean the slate: Remove all move-related mappings.
  // We keep other override types like 'deleted' or specific field overrides.
  const cleanedExceptions: Record<ISODate, EntryException> = {};
  for(const [date, ex] of Object.entries(newMaster.exceptions)) {
    if ('movedTo' in ex || 'movedFrom' in ex) {
      // This is a move exception, so we discard it.
      continue;
    }
    // This is another type of exception (e.g., deleted, override), so we keep it.
    cleanedExceptions[date] = ex;
  }
  
  newMaster.exceptions = cleanedExceptions;

  return stripUndefined(newMaster);
}

/** Dev-only validator to check for data integrity after a move. */
export function validateMaster(master: MasterEntry): void {
  if (process.env.NODE_ENV === 'production') return;

  const seenTargets = new Set<ISODate>();
  for (const [date, ex] of Object.entries(master.exceptions ?? {})) {
    if ("movedTo" in ex) {
      const T = ex.movedTo;
      const paired = master.exceptions?.[T];
      if (!paired || !("movedFrom" in paired) || paired.movedFrom !== date) {
        console.warn("Centsei Validator: Missing or mismatched pair for movedTo", { date, ex });
      }
    }
    if ("movedFrom" in ex) {
      if (seenTargets.has(date)) {
        console.error("Centsei Validator: Duplicate moved-in target found", { date });
      }
      seenTargets.add(date);
    }
  }
}
