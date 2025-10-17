import { google } from "googleapis";

export type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string;
  location?: string;
};

let calendarSingleton:
  | { calendar: ReturnType<typeof google.calendar>; calendarId: string; tz: string }
  | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `[gcal] Missing env ${name}. Set it in Vercel Project → Settings → Environment Variables.`
    );
  }
  return v;
}

/** Initialize Google Calendar client lazily (and cache it). */
function getCalendar() {
  if (calendarSingleton) return calendarSingleton;

  const clientEmail = requireEnv("GCAL_CLIENT_EMAIL");
  const rawKey = requireEnv("GCAL_PRIVATE_KEY");
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

export async function listEvents(timeMin: string, timeMax: string): Promise<ChoirEvent[]> {
  const { calendar, calendarId } = getCalendar();
  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });
  const items = res.data.items || [];
  return items.map((e) => {
    const start = e.start?.dateTime || (e.start?.date ? e.start.date + "T00:00:00Z" : "");
    const end = e.end?.dateTime || (e.end?.date ? e.end.date + "T00:00:00Z" : undefined);
    return {
      id: e.id!,
      title: e.summary || "(Χωρίς τίτλο)",
      startsAt: start!,
      endsAt: end,
      location: e.location || undefined,
    };
  });
}

export async function createEvent(evt: Omit<ChoirEvent, "id">) {
  const { calendar, calendarId, tz } = getCalendar();
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end: { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
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

export async function updateEvent(evt: ChoirEvent) {
  const { calendar, calendarId, tz } = getCalendar();
  const res = await calendar.events.patch({
    calendarId,
    eventId: evt.id,
    requestBody: {
      summary: evt.title,
      location: evt.location,
      start: { dateTime: evt.startsAt, timeZone: tz },
      end: { dateTime: evt.endsAt || evt.startsAt, timeZone: tz },
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

export async function deleteEvent(id: string) {
  const { calendar, calendarId } = getCalendar();
  await calendar.events.delete({ calendarId, eventId: id });
}
