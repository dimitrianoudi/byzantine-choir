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

function toApiError(err: any, fallback: string) {
  const status = err?.response?.status ?? (err?.code === "ENOTFOUND" ? 502 : 500);
  const code = err?.response?.data?.error?.code ?? err?.code ?? "GCAL_ERROR";
  const msg = err?.response?.data?.error?.message ?? err?.message ?? fallback;
  console.error("GCAL_API_ERROR", { status, code, msg });
  return NextResponse.json({ error: msg, code }, { status });
}

function monthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function ensureAdmin(session: any) {
  return !!session?.isLoggedIn && session.user?.role === "admin";
}

export async function GET() {
  try {
    const { timeMin, timeMax } = monthWindow();
    const events = await listEvents(timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (err) {
    return toApiError(err, "Failed to list events");
  }
}

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
      recurrence: event.recurrence,
    });

    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    return toApiError(err, "Failed to create event");
  }
}

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

    const payload: ChoirEvent & { recurrence?: any } = {
      id: String(event.id),
      title: String(event.title ?? "(Χωρίς τίτλο)"),
      startsAt: String(event.startsAt ?? new Date().toISOString()),
      endsAt: event.endsAt ? String(event.endsAt) : undefined,
      location: event.location ? String(event.location) : undefined,
      recurrence: event.recurrence,
    };

    const updated = await updateEvent(payload);
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    return toApiError(err, "Failed to update event");
  }
}

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
    return toApiError(err, "Failed to delete event");
  }
}
