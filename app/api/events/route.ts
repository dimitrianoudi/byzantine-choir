// app/api/events/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listEvents, createEvent, updateEvent, deleteEvent, type ChoirEvent } from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function monthWindow() {
  // fetch from 1st day of previous month to last day of next month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function ensureAdmin(session: any) {
  return session?.isLoggedIn && session.user?.role === "admin";
}

// GET: list events
export async function GET() {
  const { timeMin, timeMax } = monthWindow();
  const events = await listEvents(timeMin, timeMax);
  return NextResponse.json({ events });
}

// POST: create (admin)
export async function POST(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
}

// PUT: update (admin)
export async function PUT(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { event } = await req.json().catch(() => ({}));
  if (!event?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updated = await updateEvent({
    id: String(event.id),
    title: String(event.title ?? ""),
    startsAt: String(event.startsAt ?? new Date().toISOString()),
    endsAt: event.endsAt ? String(event.endsAt) : undefined,
    location: event.location ? String(event.location) : undefined,
  } as ChoirEvent);
  return NextResponse.json({ ok: true, event: updated });
}

// DELETE: delete (admin)
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteEvent(String(id));
  return NextResponse.json({ ok: true });
}
