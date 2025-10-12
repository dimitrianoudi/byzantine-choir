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

  const { filename, type } = await req.json().catch(() => ({}));
  if (!filename || !type) {
    return NextResponse.json({ error: "filename and type required" }, { status: 400 });
  }

  const safeName = String(filename).replace(/[^\w\d\-_.]+/g, "_");
  const prefix = type === "application/pdf" ? "pdfs" : "podcasts";
  const key = `${prefix}/${Date.now()}-${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: type,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 minutes
  return NextResponse.json({ url, key });
}
