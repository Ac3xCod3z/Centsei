
type PushOptions = {
  calendarId?: string;        // default: "primary"
  timezone: string;           // IANA TZ, e.g. "America/Denver"
  windowDays?: number;        // default 90
  reminders?: { minutes: number }[]; // default [{ minutes: 1440 }]
  useRecurring?: boolean;     // default false (expand into instances)
};

export type CentseiEntryForCalendar = {
  id: string;
  name: string;
  note?: string;
  category?: string;
  amount?: number;
  date: string;               // ISO yyyy-mm-dd (local date of occurrence)
  time?: string | null;       // "08:00" etc (optional). If omitted, create all-day
  recurrence?: string;
};

/** Build Google event payload with idempotency tags */
export function buildEventPayload(e: CentseiEntryForCalendar, tz: string) {
  const isAllDay = !e.time;
  const startISO = isAllDay ? undefined : `${e.date}T${e.time}:00`;
  const endISO   = isAllDay ? undefined : `${e.date}T${e.time}:00`;

  const summary = e.name;
  const description =
    `${e.note ?? ''}\n\n— Created by Centsei\n(Do not edit 'centsei*' extended properties)`;

  const event: any = {
    summary,
    description,
    extendedProperties: {
      private: {
        centseiEntryId: e.id,
        centseiOccurrenceDate: e.date
      }
    }
  };

  if (isAllDay) {
    event.start = { date: e.date, timeZone: tz };
    event.end   = { date: e.date, timeZone: tz };
  } else {
    event.start = { dateTime: startISO, timeZone: tz };
    // 1h block by default; adjust as you like
    event.end   = { dateTime: endISO, timeZone: tz };
  }

  return event;
}

/** Find an existing event by our private extended property (idempotency) */
async function findExistingEvent(accessToken: string, calendarId: string, entryId: string, date: string) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('privateExtendedProperty', `centseiEntryId=${entryId}`);
  url.searchParams.append('privateExtendedProperty', `centseiOccurrenceDate=${date}`);
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('singleEvents', 'true');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`events.list failed: ${res.status}`);
  const data = await res.json();
  return data.items?.[0] ?? null;
}

/** Insert or patch one event */
async function upsertEvent(accessToken: string, calendarId: string, payload: any, existingId?: string) {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const url  = existingId ? `${base}/${existingId}` : base;
  const method = existingId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`${method} ${existingId ? 'events.patch' : 'events.insert'} failed: ${res.status}`);
  return res.json();
}

/** Batch export with dedupe */
export async function exportEntries(
  accessToken: string,
  entries: CentseiEntryForCalendar[],
  opts: PushOptions
) {
  const calendarId = opts.calendarId || 'primary';
  const tz = opts.timezone;
  const reminders = opts.reminders ?? [{ minutes: 24 * 60 }];

  // Upsert sequentially (keep it simple; you can parallelize in small chunks)
  for (const e of entries) {
    const payload = buildEventPayload(e, tz);
    payload.reminders = { useDefault: false, overrides: reminders };

    const existing = await findExistingEvent(accessToken, calendarId, e.id, e.date);
    await upsertEvent(accessToken, calendarId, payload, existing?.id);
  }
}
