import { google } from "googleapis";

/** ---------- Public Types ---------- */
export type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string;   // RFC3339 (local allowed; server applies tz)
  endsAt?: string;
  location?: string;
  attendees?: string[];
};

export type RecurrenceInput = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number; // default 1
  until?: string;    // YYYY-MM-DD (optional end date)
};

/** ---------- Internal: env + client ---------- */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `[gcal] Missing env ${name}. Set it in Vercel Project → Settings → Environment Variables.`
    );
  }
  return v;
}

let calendarSingleton:
  | {
      calendar: ReturnType<typeof google.calendar>;
      calendarId: string;
      tz: string;
    }
  | null = null;

function getCalendar() {
  if (calendarSingleton) return calendarSingleton;

  const clientEmail = requireEnv("GCAL_CLIENT_EMAIL");
  const rawKey = requireEnv("GCAL_PRIVATE_KEY");
  // Accept both literal "\n" or true multiline paste
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const calendarId = requireEnv("GCAL_CALENDAR_ID");
  const tz = process.env.GCAL_TIMEZONE || "Europe/Athens";

  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth: jwt });
  calendarSingleton = { calendar, calendarId, tz };
  return calendarSingleton;
}

/** ---------- Internal: recurrence helper (RRULE) ---------- */

function rruleFrom(rec: RecurrenceInput, startsAt: string) {
  const parts: string[] = [`FREQ=${rec.freq}`, `INTERVAL=${rec.interval ?? 1}`];

  // For WEEKLY, include the weekday from the local start date.
  // (We pass requestBody.start/end with timeZone, so Google interprets in tz.)
  if (rec.freq === "WEEKLY") {
    const d = new Date(startsAt); // interpret as local when no 'Z'
    const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    parts.push(`BYDAY=${days[d.getDay()]}`);
  }

  // Optional end date (UNTIL must be UTC basic format YYYYMMDDTHHMMSSZ)
  if (rec.until) {
    const u = new Date(rec.until);
    if (!isNaN(u.getTime())) {
      // End-of-day UTC so the "until" date is included
      const utc = new Date(Date.UTC(u.getFullYear(), u.getMonth(), u.getDate(), 23, 59, 59));
      const y = utc.getUTCFullYear();
      const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
      const d = String(utc.getUTCDate()).padStart(2, "0");
      const hh = String(utc.getUTCHours()).padStart(2, "0");
      const mm = String(utc.getUTCMinutes()).padStart(2, "0");
      const ss = String(utc.getUTCSeconds()).padStart(2, "0");
      parts.push(`UNTIL=${y}${m}${d}T${hh}${mm}${ss}Z`);
    }
  }

  return `RRULE:${parts.join(";")}`;
}

/** ---------- Public API ---------- */

/**
 * List events within [timeMin, timeMax].
 * Uses singleEvents=true to expand recurring instances.
 */
export async function listEvents(timeMin: string, timeMax: string): Promise<ChoirEvent[]> {
  const { calendar, calendarId } = getCalendar();

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,   // expand recurrences into instances
    orderBy: "startTime",
    maxResults: 2500,
  });

  const items = res.data.items || [];
  return items
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const start =
        e.start?.dateTime ||
        (e.start?.date ? `${e.start.date}T00:00:00` : ""); // all-day → midnight local (no Z)
      const end =
        e.end?.dateTime ||
        (e.end?.date ? `${e.end.date}T00:00:00` : undefined);

      return {
        id: e.id!,
        title: e.summary || "(Χωρίς τίτλο)",
        startsAt: start!,
        endsAt: end,
        location: e.location || undefined,
        attendees: e.attendees?.map(a => a.email!).filter(Boolean),
      };
    });
}

/**
 * Create a new event. `startsAt` / `endsAt` can be local RFC3339 (no Z).
 * We send timeZone so Google interprets them in `tz` (default Europe/Athens).
 * Also sends invitations via sendUpdates: "all".
 */
export async function createEvent(
  evt: Omit<ChoirEvent, "id"> & { recurrence?: RecurrenceInput }
): Promise<ChoirEvent> {
  const { calendar, calendarId, tz } = getCalendar();
  const recurrence = evt.recurrence ? [rruleFrom(evt.recurrence, evt.startsAt)] : undefined;

  const res = await calendar.events.insert({
    calendarId,
    sendUpdates: "all", // email invites/updates
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end:   { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
      recurrence,
      attendees: evt.attendees?.map(email => ({ email })),
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    },
  });

  const e = res.data;
  return {
    id: e.id!,
    title: e.summary || evt.title,
    startsAt: e.start?.dateTime || evt.startsAt,
    endsAt: e.end?.dateTime || evt.endsAt,
    location: e.location || evt.location,
    attendees: e.attendees?.map(a => a.email!).filter(Boolean),
  };
}

/**
 * Update an event. Recurrence handling:
 *  - recurrence: undefined → leave as-is
 *  - recurrence: object   → set to that RRULE
 *  - recurrence: null     → clear recurrence
 * Also sends invitations/updates via sendUpdates: "all".
 */
export async function updateEvent(
  evt: ChoirEvent & { recurrence?: RecurrenceInput | null }
): Promise<ChoirEvent> {
  const { calendar, calendarId, tz } = getCalendar();

  let recurrence: string[] | null | undefined = undefined;
  if (evt.recurrence === null) recurrence = null;
  if (evt.recurrence && typeof evt.recurrence === "object") {
    recurrence = [rruleFrom(evt.recurrence, evt.startsAt)];
  }

  const res = await calendar.events.patch({
    calendarId,
    eventId: evt.id,
    sendUpdates: "all",
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end:   { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
      ...(recurrence !== undefined ? { recurrence } : {}),
      attendees: evt.attendees?.map(email => ({ email })),
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    },
  });

  const e = res.data;
  return {
    id: e.id!,
    title: e.summary || evt.title,
    startsAt: e.start?.dateTime || evt.startsAt,
    endsAt: e.end?.dateTime || evt.endsAt,
    location: e.location || evt.location,
    attendees: e.attendees?.map(a => a.email!).filter(Boolean),
  };
}

/** Delete an event by id. */
export async function deleteEvent(id: string): Promise<void> {
  const { calendar, calendarId } = getCalendar();
  await calendar.events.delete({ calendarId, eventId: id, sendUpdates: "all" });
}
