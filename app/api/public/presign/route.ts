export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { presignGet } from "@/lib/s3";

function isAllowedKey(key: string) {
  const k = key.toLowerCase();
  const okPath = key.startsWith("Ακολουθίες/");
  const okExt = k.endsWith(".mp3") || k.endsWith(".m4a") || k.endsWith(".aac");
  return okPath && okExt;
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const key = typeof body?.key === "string" ? body.key : "";
  if (!key || !isAllowedKey(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const url = await presignGet(key, 60 * 60);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Presign failed" }, { status: 500 });
  }
}
