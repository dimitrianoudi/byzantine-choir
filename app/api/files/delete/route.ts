export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { s3, BUCKET } from "@/lib/s3";
import { recordDeletionAudit } from "@/lib/deletionAudit";
import { clearListingCache } from "@/lib/listingCache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const key = body?.key;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    try {
      await recordDeletionAudit({
        email: session.user?.email,
        role: session.user?.role,
        kind: "library_file",
        itemKey: key,
      });
    } catch (auditErr) {
      console.error("DELETE_FILE_AUDIT_ERROR:", auditErr);
    }

    clearListingCache();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE_FILE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
