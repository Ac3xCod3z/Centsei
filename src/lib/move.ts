// src/lib/move.ts
import type { MasterEntry, ISODate, EntryException, Entry } from './types';
import { stripUndefined } from './utils';
import { format } from 'date-fns';

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
    sourceDate: ISODate,
    targetDate: ISODate
  ): MasterEntry {
    if (sourceDate === targetDate) return master;
  
    const newMaster = { ...master, exceptions: { ...(master.exceptions ?? {}) } };
  
    const originalSourceDate = newMaster.exceptions[sourceDate]?.movedFrom ?? sourceDate;
    
    const oldTarget = Object.entries(newMaster.exceptions).find(
      ([date, ex]) => ex.movedFrom === originalSourceDate
    )?.[0];
    if (oldTarget && oldTarget !== targetDate) {
        delete newMaster.exceptions[oldTarget];
    }
  
    newMaster.exceptions[originalSourceDate] = { movedTo: targetDate };
  
    const sourceOverrides = newMaster.exceptions[sourceDate];
    newMaster.exceptions[targetDate] = { 
        movedFrom: originalSourceDate,
        ...(sourceOverrides && !sourceOverrides.movedFrom && sourceOverrides),
    };
  
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
  
  const cleanedExceptions: Record<ISODate, EntryException> = {};
  for(const [date, ex] of Object.entries(newMaster.exceptions)) {
    if ('movedTo' in ex || 'movedFrom' in ex) {
      continue;
    }
    cleanedExceptions[date] = ex;
  }
  
  newMaster.exceptions = cleanedExceptions;

  return stripUndefined(newMaster);
}

/** Updates the master entry for all occurrences */
export function updateSeries(master: MasterEntry, newData: Partial<Entry>): MasterEntry {
    const updatedMaster = { ...master };
    
    // Apply new top-level data
    if(newData.name) updatedMaster.name = newData.name;
    if(newData.amount) updatedMaster.amount = newData.amount;
    if(newData.category) updatedMaster.category = newData.category;
    if(newData.isAutoPay) updatedMaster.isAutoPay = newData.isAutoPay;
    
    // Clear out all override exceptions, as the master is the new source of truth
    const cleanedExceptions: Record<ISODate, EntryException> = {};
     for(const [date, ex] of Object.entries(master.exceptions ?? {})) {
        if ('movedTo' in ex || 'movedFrom' in ex || ex.movedFrom === 'deleted') {
            cleanedExceptions[date] = ex; // Preserve moves and deletions
        }
    }
    updatedMaster.exceptions = cleanedExceptions;
    
    return stripUndefined(updatedMaster);
}

/** Updates a single occurrence by creating an exception */
export function updateSingleOccurrence(master: MasterEntry, instanceDate: ISODate, newData: Partial<Entry>): MasterEntry {
    const updatedMaster = { ...master, exceptions: { ...(master.exceptions ?? {}) } };
    const currentException = updatedMaster.exceptions[instanceDate] || {};
    
    const newException: EntryException = {
        ...currentException,
        name: newData.name !== master.name ? newData.name : undefined,
        amount: newData.amount !== master.amount ? newData.amount : undefined,
        category: newData.category !== master.category ? newData.category : undefined,
        isAutoPay: newData.isAutoPay !== master.isAutoPay ? newData.isAutoPay : undefined,
        isPaid: newData.isPaid,
    };
    
    updatedMaster.exceptions[instanceDate] = stripUndefined(newException);

    return stripUndefined(updatedMaster);
}


/** Dev-only validator to check for data integrity after a move. */
export function validateMaster(master: MasterEntry): void {
  if (process.env.NODE_ENV === 'production') return;

  const seenTargets = new Set<ISODate>();
  for (const [date, ex] of Object.entries(master.exceptions ?? {})) {
    if ("movedTo" in ex) {
      const T = ex.movedTo;
      if (!T) continue;
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

/** Deletes the entire series by simply deleting the master entry */
export function deleteSeries(master: MasterEntry): MasterEntry | null {
  // The logic for this is handled in the dashboard by deleting the doc.
  // This function is a placeholder for consistency.
  return null;
}

/** Deletes a single occurrence by creating a 'deleted' exception */
export function deleteSingleOccurrence(master: MasterEntry, instanceDate: ISODate): MasterEntry {
  const updatedMaster = { ...master, exceptions: { ...(master.exceptions ?? {}) } };
  const currentException = updatedMaster.exceptions[instanceDate] || {};
  
  updatedMaster.exceptions[instanceDate] = {
    ...currentException,
    movedFrom: 'deleted',
  };
  
  // Clean up other properties that are now irrelevant
  delete updatedMaster.exceptions[instanceDate].movedTo;
  delete updatedMaster.exceptions[instanceDate].isPaid;
  delete updatedMaster.exceptions[instanceDate].name;
  delete updatedMaster.exceptions[instanceDate].amount;
  delete updatedMaster.exceptions[instanceDate].category;

  return stripUndefined(updatedMaster);
}
