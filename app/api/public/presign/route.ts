export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { presignGet } from "@/lib/s3";
import { isAkolouthiesAudioKey } from "@/lib/akolouthies";
import * as Sentry from "@sentry/nextjs";

export async function POST(req: Request) {
  const t0 = Date.now();
  let body: any = {};
  try { body = await req.json(); } catch {}

  const key = typeof body?.key === "string" ? body.key : "";
  const share = body?.share === true;
  if (!key || !isAkolouthiesAudioKey(key)) {
    Sentry.metrics.count("api.public_presign.invalid_key", 1);
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const expiresIn = share ? 60 * 60 * 24 * 7 : 60 * 60;
    const url = await presignGet(key, expiresIn);
    Sentry.metrics.count("api.public_presign.success", 1);
    Sentry.metrics.distribution("api.public_presign.duration_ms", Date.now() - t0);
    return NextResponse.json({ url });
  } catch (err: any) {
    Sentry.captureException(err);
    Sentry.metrics.count("api.public_presign.error", 1);
    return NextResponse.json({ error: err?.message || "Presign failed" }, { status: 500 });
  }
}
