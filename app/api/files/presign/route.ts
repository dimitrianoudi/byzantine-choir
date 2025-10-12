export const runtime = "nodejs"; // ← add this

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { presignGet } from "@/lib/s3";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  try {
    const url = await presignGet(key, 3600);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("PRESIGN_ERROR:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
