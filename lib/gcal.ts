export type RecurrenceInput = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;      // default 1
  until?: string;         // ISO date (YYYY-MM-DD) or local datetime
};

// helper: make RRULE from input
function rruleFrom(rec: RecurrenceInput, startsAt: string) {
  const parts: string[] = [`FREQ=${rec.freq}`, `INTERVAL=${rec.interval ?? 1}`];

  // For weekly repeats, include the weekday of the start date (MO..SU)
  if (rec.freq === 'WEEKLY') {
    const d = new Date(startsAt);
    const days = ['SU','MO','TU','WE','TH','FR','SA'];
    parts.push(`BYDAY=${days[d.getUTCDay()]}`); // ok since Google applies tz in requestBody.start/end
  }

  // Optional end date (UNTIL must be in UTC “basic” format: YYYYMMDDTHHMMSSZ)
  if (rec.until) {
    const u = new Date(rec.until);
    if (!isNaN(u.getTime())) {
      const utc = new Date(Date.UTC(u.getFullYear(), u.getMonth(), u.getDate(), 23, 59, 59));
      const y = utc.getUTCFullYear();
      const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
      const d = String(utc.getUTCDate()).padStart(2, '0');
      const hh = String(utc.getUTCHours()).padStart(2, '0');
      const mm = String(utc.getUTCMinutes()).padStart(2, '0');
      const ss = String(utc.getUTCSeconds()).padStart(2, '0');
      parts.push(`UNTIL=${y}${m}${d}T${hh}${mm}${ss}Z`);
    }
  }

  return `RRULE:${parts.join(';')}`;
}

export type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  // (we don’t need to return recurrence here because we request singleEvents=true,
  // which expands instances. But you can add it if you want to show the rule.)
};

export async function createEvent(evt: Omit<ChoirEvent, "id"> & { recurrence?: RecurrenceInput }) {
  const { calendar, calendarId, tz } = getCalendar();
  const recurrence = evt.recurrence ? [rruleFrom(evt.recurrence, evt.startsAt)] : undefined;

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end:   { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
      recurrence,
    },
  });
  const e = res.data;
  return {
    id: e.id!,
    title: e.summary || evt.title,
    startsAt: e.start?.dateTime || evt.startsAt,
    endsAt: e.end?.dateTime || evt.endsAt,
    location: e.location || evt.location,
  } as ChoirEvent;
}

export async function updateEvent(evt: ChoirEvent & { recurrence?: RecurrenceInput | null }) {
  const { calendar, calendarId, tz } = getCalendar();

  // If recurrence===null we clear it; if provided we set it; if undefined we leave as-is
  let recurrence: string[] | undefined | null = undefined;
  if (evt.recurrence === null) recurrence = null;
  if (evt.recurrence && typeof evt.recurrence === 'object') {
    recurrence = [rruleFrom(evt.recurrence, evt.startsAt)];
  }

  const res = await calendar.events.patch({
    calendarId,
    eventId: evt.id,
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end:   { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
      ...(recurrence !== undefined ? { recurrence } : {}),
    },
  });
  const e = res.data;
  return {
    id: e.id!,
    title: e.summary || evt.title,
    startsAt: e.start?.dateTime || evt.startsAt,
    endsAt: e.end?.dateTime || evt.endsAt,
    location: e.location || evt.location,
  } as ChoirEvent;
}
