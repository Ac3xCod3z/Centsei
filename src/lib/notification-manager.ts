import { Entry } from './types';
import { formatCurrency, parseDateInTimezone } from './utils';
import { add, isAfter, isBefore, set } from 'date-fns';
import { recurrenceIntervalMonths } from './constants';

const NOTIFICATION_TAG_PREFIX = 'centsei-bill-';
const NOTIFICATION_WINDOW_DAYS = 90; // Schedule notifications for the next 90 days.

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  return navigator.serviceWorker.ready;
}

export async function cancelAllNotificationsLocal(toast: any) {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return;

  try {
    const notifications = await registration.getNotifications({
      // An empty tag will match all notifications from this origin.
      // This is a more robust way to clear all notifications from this app.
      // includeTriggered: true, // This is not needed for clearing
    });
    
    let cancelledCount = 0;
    for (const notification of notifications) {
        if (notification.tag.startsWith(NOTIFICATION_TAG_PREFIX)) {
            notification.close();
            cancelledCount++;
        }
    }
    
    if (cancelledCount > 0) {
       console.log(`${cancelledCount} notifications cancelled.`);
    }
  } catch (e) {
    console.error('Error cancelling notifications:', e);
  }
}

function getNextBillOccurrences(entry: Entry, timezone: string): Date[] {
  const occurrences: Date[] = [];
  const now = new Date();
  const scheduleUntil = add(now, { days: NOTIFICATION_WINDOW_DAYS });

  const baseDate = parseDateInTimezone(entry.date, timezone);
  
  // Set the notification time to 8 AM in the user's local timezone for all occurrences
  const notificationTime = { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 };

  if (entry.recurrence === 'none') {
    const occurrence = set(baseDate, notificationTime);
    if (isAfter(occurrence, now) && isBefore(occurrence, scheduleUntil)) {
      occurrences.push(occurrence);
    }
  } else if (entry.recurrence === 'weekly' || entry.recurrence === 'bi-weekly') {
    let nextOccurrence = set(baseDate, notificationTime);
    const weeksToAdd = entry.recurrence === 'weekly' ? 1 : 2;
    
    while(isBefore(nextOccurrence, now)){
      nextOccurrence = add(nextOccurrence, { weeks: weeksToAdd });
    }

    while (isBefore(nextOccurrence, scheduleUntil)) {
      occurrences.push(nextOccurrence);
      nextOccurrence = add(nextOccurrence, { weeks: weeksToAdd });
    }
  } else if (entry.recurrence && entry.recurrence !== 'none') {
    const interval = recurrenceIntervalMonths[entry.recurrence as keyof typeof recurrenceIntervalMonths];
    if (!interval) return [];

    let nextOccurrence = set(baseDate, notificationTime);

    while(isBefore(nextOccurrence, now)){
      nextOccurrence = add(nextOccurrence, { months: interval });
    }

    while (isBefore(nextOccurrence, scheduleUntil)) {
      occurrences.push(nextOccurrence);
      nextOccurrence = add(nextOccurrence, { months: interval });
    }
  }

  return occurrences;
}


export async function scheduleNotificationsLocal(entries: Entry[], timezone: string, toast: any) {
  const registration = await getServiceWorkerRegistration();
  if (!registration || !('showNotification' in registration) || !(window as any).TimestampTrigger) {
    console.error('Notification scheduling prerequisites not met.');
    return;
  }
  
  await cancelAllNotificationsLocal(toast);

  const billEntries = entries.filter((entry) => entry.type === 'bill');
  let scheduledCount = 0;

  for (const entry of billEntries) {
    const occurrences = getNextBillOccurrences(entry, timezone);
    
    for (const occurrenceDate of occurrences) {
      try {
        await registration.showNotification('Bill Due Today', {
          tag: `${NOTIFICATION_TAG_PREFIX}${entry.id}-${occurrenceDate.toISOString().split('T')[0]}`,
          body: `${entry.name} (${formatCurrency(entry.amount)}) is due.`,
          showTrigger: new (window as any).TimestampTrigger(occurrenceDate.getTime()),
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          silent: false,
        });
        scheduledCount++;
      } catch (e) {
        // This can fail if the timestamp is in the past, which is expected during logic checks.
        // It's safe to ignore these errors.
      }
    }
  }

  if (scheduledCount > 0) {
    console.log(`Successfully scheduled ${scheduledCount} bill notifications.`);
  }
}
