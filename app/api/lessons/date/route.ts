export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  isIsoLessonDate,
  parseMaterialLessonFolderPrefix,
  saveLessonDateForPrefix,
} from "@/lib/lessonDates";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const prefix = typeof body?.prefix === "string" ? body.prefix : "";
  const date = typeof body?.date === "string" ? body.date.trim() : "";

  if (!parseMaterialLessonFolderPrefix(prefix)) {
    return NextResponse.json({ error: "Μη έγκυρος φάκελος μαθήματος." }, { status: 400 });
  }

  if (date && !isIsoLessonDate(date)) {
    return NextResponse.json(
      { error: "Μη έγκυρη ημερομηνία. Χρησιμοποιήστε μορφή YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    await saveLessonDateForPrefix(prefix, date);
    return NextResponse.json({ ok: true, date: date || null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save lesson date" },
      { status: 500 }
    );
  }
}
