import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLoginAnalytics } from "@/lib/loginAudit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || 30);

  try {
    const data = await getLoginAnalytics(days);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load analytics" }, { status: 500 });
  }
}
