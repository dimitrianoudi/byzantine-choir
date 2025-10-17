// app/api/events/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type ChoirEvent,
} from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pulls a sensible time window: prev month → next month */
function monthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function ensureAdmin(session: any) {
  return !!session?.isLoggedIn && session.user?.role === "admin";
}

/** GET /api/events — list events in window */
export async function GET() {
  try {
    const { timeMin, timeMax } = monthWindow();
    const events = await listEvents(timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (err) {
    console.error("EVENTS_GET_ERROR", err);
    return NextResponse.json({ error: "Failed to list events" }, { status: 500 });
  }
}

/** POST /api/events — create (admin only) */
export async function POST(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { event } = await req.json().catch(() => ({}));
    if (!event?.title || !event?.startsAt) {
      return NextResponse.json({ error: "Missing title/startsAt" }, { status: 400 });
    }

    const created = await createEvent({
      title: String(event.title),
      startsAt: String(event.startsAt),
      endsAt: event.endsAt ? String(event.endsAt) : undefined,
      location: event.location ? String(event.location) : undefined,
    });

    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    console.error("EVENTS_POST_ERROR", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

/** PUT /api/events — update (admin only) */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { event } = await req.json().catch(() => ({}));
    if (!event?.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Build a ChoirEvent payload with reasonable fallbacks
    const payload: ChoirEvent = {
      id: String(event.id),
      title: String(event.title ?? "(Χωρίς τίτλο)"),
      startsAt: String(event.startsAt ?? new Date().toISOString()),
      endsAt: event.endsAt ? String(event.endsAt) : undefined,
      location: event.location ? String(event.location) : undefined,
    };

    const updated = await updateEvent(payload);
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    console.error("EVENTS_PUT_ERROR", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

/** DELETE /api/events — delete (admin only) */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await deleteEvent(String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EVENTS_DELETE_ERROR", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
