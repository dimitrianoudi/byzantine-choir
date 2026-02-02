export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { s3, BUCKET } from "@/lib/s3";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

function sanitizeFilename(name: string): string {
  const n = String(name).normalize("NFC").trim();
  return n
    .replace(/\//g, "_")
    .replace(/[\u0000-\u001F]/g, "_")
    .replace(/[<>:"\\|?*]/g, "_")
    .replace(/\s+/g, " ");
}

async function existsKey(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404) return false;
    const name = String(err?.name || "");
    if (name === "NotFound" || name === "NoSuchKey") return false;
    throw err;
  }
}

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

  const fromKey = typeof body?.fromKey === "string" ? body.fromKey : "";
  const newNameRaw = typeof body?.newName === "string" ? body.newName : "";

  if (!fromKey || !newNameRaw) {
    return NextResponse.json({ error: "Missing fromKey/newName" }, { status: 400 });
  }

  const folder = fromKey.split("/").slice(0, -1).join("/");
  const newName = sanitizeFilename(newNameRaw);
  const toKey = folder ? `${folder}/${newName}` : newName;

  if (toKey === fromKey) {
    return NextResponse.json({ ok: true, toKey });
  }

  try {
    const exists = await existsKey(toKey);
    if (exists) {
      return NextResponse.json(
        { error: "A file with this name already exists in this folder.", toKey },
        { status: 409 }
      );
    }

    const copySource = encodeURIComponent(`${BUCKET}/${fromKey}`);

    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        Key: toKey,
        CopySource: copySource,
      })
    );

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: fromKey,
      })
    );

    return NextResponse.json({ ok: true, toKey });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Rename failed" },
      { status: 500 }
    );
  }
}