import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { recordActivityAudit } from "@/lib/activityAudit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ ok: true });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const event = body?.event === "session_end" ? "session_end" : "page_view";
  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId) return NextResponse.json({ ok: true });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  await recordActivityAudit({
    email: session.user.email,
    role: session.user.role,
    event,
    sessionId,
    path: typeof body?.path === "string" ? body.path : undefined,
    durationMs: Number(body?.durationMs) || 0,
    ip,
    country: req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "unknown",
    region: req.headers.get("x-vercel-ip-country-region") || "unknown",
    city: req.headers.get("x-vercel-ip-city") || "unknown",
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({ ok: true });
}
