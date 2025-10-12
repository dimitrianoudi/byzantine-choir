// app/api/files/presign/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { s3, BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: Request) {
  const session = await getSession();
  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { filename, mime } = body || {};

  if (!filename || !mime) {
    return NextResponse.json({ error: "filename and mime required" }, { status: 400 });
  }

  const safe = String(filename).replace(/[^\w\d\-_.]+/g, "_");
  const prefix = mime === "application/pdf" ? "pdfs" : "podcasts";
  const key = `${prefix}/${Date.now()}-${safe}`;

  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mime });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min

  return NextResponse.json({ url, key });
}
