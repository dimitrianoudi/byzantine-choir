// lib/gcal.ts
import { google } from "googleapis";

const clientEmail = process.env.GCAL_CLIENT_EMAIL!;
const rawKey = process.env.GCAL_PRIVATE_KEY!;
const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
const calendarId = process.env.GCAL_CALENDAR_ID!;
const tz = process.env.GCAL_TIMEZONE || "Europe/Athens";

const scopes = ["https://www.googleapis.com/auth/calendar"];
const jwt = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes,
});
const calendar = google.calendar({ version: "v3", auth: jwt });

export type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string;
  location?: string;
};

export async function listEvents(timeMin: string, timeMax: string): Promise<ChoirEvent[]> {
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
  await calendar.events.delete({ calendarId, eventId: id });
}
