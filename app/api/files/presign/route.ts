export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { s3, BUCKET, presignGet } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  // 1) DOWNLOAD presign: expects { key }
  if (body?.key && !body?.filename && !body?.mime) {
    try {
      const url = await presignGet(body.key, 60 * 60); // 1 hour
      return NextResponse.json({ url, key: body.key });
    } catch (err: any) {
      console.error("PRESIGN_GET_ERROR:", err);
      return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
  }

  // 2) UPLOAD presign: expects { filename, mime } (admin only)
  if (body?.filename && body?.mime) {
    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const safe = String(body.filename).replace(/[^\w\d\-_.]+/g, "_");
      const prefix = body.mime === "application/pdf" ? "pdfs" : "podcasts";
      const key = `${prefix}/${Date.now()}-${safe}`;
      const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: body.mime });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
      return NextResponse.json({ url, key });
    } catch (err: any) {
      console.error("PRESIGN_UPLOAD_ERROR:", err);
      return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Invalid body. Use { key } for download OR { filename, mime } for upload." },
    { status: 400 }
  );
}
