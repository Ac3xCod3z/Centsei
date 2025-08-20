
// src/lib/google-calendar.ts

import type { Entry } from "./types";
import { buildEventPayload, findExistingEvent, upsertEvent } from './google-calendar-helpers';

type PushOptions = {
  calendarId?: string; // default: "primary"
  timezone: string; // IANA TZ, e.g. "America/Denver"
  windowDays?: number; // default 90
  reminders?: { minutes: number }[]; // default [{ minutes: 1440 }]
  useRecurring?: boolean; // default false (expand into instances)
};

export type CentseiEntryForCalendar = {
  id: string;
  name: string;
  note?: string;
  category?: string;
  amount?: number;
  date: string; // ISO yyyy-mm-dd (local date of occurrence)
  time?: string | null; // "08:00" etc (optional). If omitted, create all-day
  recurrence?: string;
};


/** Batch export with dedupe */
export async function exportEntries(
  accessToken: string,
  entries: CentseiEntryForCalendar[],
  opts: PushOptions
) {
  const calendarId = opts.calendarId || "primary";
  const tz = opts.timezone;
  const reminders = opts.reminders ?? [{ minutes: 24 * 60 }];

  // Upsert sequentially (keep it simple; you can parallelize in small chunks)
  for (const e of entries) {
    const payload = buildEventPayload(e, tz);
    payload.reminders = { useDefault: false, overrides: reminders };

    const existing = await findExistingEvent(
      accessToken,
      calendarId,
      e.id,
      e.date
    );
    await upsertEvent(accessToken, calendarId, payload, existing?.id);
  }
}

/** Creates a new calendar named 'Centsei' in the user's Google account. */
export async function createCentseiCalendar(accessToken: string, timezone: string): Promise<string> {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            summary: 'Centsei',
            description: 'Financial entries auto-created by your Centsei app.',
            timeZone: timezone,
        }),
    });
    if (!res.ok) {
        throw new Error(`Failed to create calendar: ${res.statusText}`);
    }
    const calendar = await res.json();
    return calendar.id;
}


/** Deletes all Centsei-created events from a specific calendar. */
export async function deleteCentseiEvents(accessToken: string, calendarId: string): Promise<number> {
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    let deletedCount = 0;
    let pageToken: string | undefined = undefined;

    do {
        const url = new URL(base);
        url.searchParams.set('privateExtendedProperty', 'centseiEntryId');
        url.searchParams.set('maxResults', '250');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const listRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!listRes.ok) throw new Error(`Failed to list events: ${listRes.statusText}`);
        
        const eventData = await listRes.json();
        
        for (const event of eventData.items) {
            const deleteUrl = `${base}/${event.id}`;
            const deleteRes = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (deleteRes.ok) {
                deletedCount++;
            } else {
                console.warn(`Failed to delete event ${event.id}, continuing...`);
            }
        }
        pageToken = eventData.nextPageToken;
    } while (pageToken);

    return deletedCount;
}

