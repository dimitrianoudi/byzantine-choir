export const runtime = "nodejs"; // ← add this

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listByPrefix } from "@/lib/s3";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const podcasts = await listByPrefix("podcasts/");
    const pdfs = await listByPrefix("pdfs/");
    const items = [
      ...podcasts.map(p => ({ ...p, type: "podcast" as const })),
      ...pdfs.map(p => ({ ...p, type: "pdf" as const })),
    ].sort((a,b) => (b.lastModified || "").localeCompare(a.lastModified || ""));
    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("FILES_LIST_ERROR:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
