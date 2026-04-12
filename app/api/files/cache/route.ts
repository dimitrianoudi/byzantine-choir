export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { clearListingCache } from "@/lib/listingCache";

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  clearListingCache();
  return NextResponse.json({ ok: true });
}
