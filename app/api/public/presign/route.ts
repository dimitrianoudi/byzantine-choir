export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { presignGet } from "@/lib/s3";
import * as Sentry from "@sentry/nextjs";

function isAllowedKey(key: string) {
  const k = key.toLowerCase();
  const okPath = key.startsWith("Ακολουθίες/");
  const okExt = k.endsWith(".mp3") || k.endsWith(".m4a") || k.endsWith(".aac");
  return okPath && okExt;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  let body: any = {};
  try { body = await req.json(); } catch {}

  const key = typeof body?.key === "string" ? body.key : "";
  if (!key || !isAllowedKey(key)) {
    Sentry.metrics.count("api.public_presign.invalid_key", 1);
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const url = await presignGet(key, 60 * 60);
    Sentry.metrics.count("api.public_presign.success", 1);
    Sentry.metrics.distribution("api.public_presign.duration_ms", Date.now() - t0);
    return NextResponse.json({ url });
  } catch (err: any) {
    Sentry.captureException(err);
    Sentry.metrics.count("api.public_presign.error", 1);
    return NextResponse.json({ error: err?.message || "Presign failed" }, { status: 500 });
  }
}
