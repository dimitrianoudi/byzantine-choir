export const runtime = "nodejs";

import crypto from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BUCKET, s3 } from "@/lib/s3";
import {
  rejectUnsafeMutationOrigin,
  requirePublicationAdmin,
} from "@/lib/publications/admin";

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const idSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/);
const uploadSchema = z.object({
  publicationId: idSchema,
  filename: z.string().trim().min(1).max(240),
  mime: z.enum(["application/pdf", "application/epub+zip"]),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});
const deleteSchema = z.object({
  publicationId: idSchema,
  key: z.string().trim().min(1).max(1000),
});

function safeFilename(value: string) {
  return value
    .normalize("NFC")
    .replace(/\//g, "_")
    .replace(/[\u0000-\u001f<>:"\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;
  if (!BUCKET) {
    return NextResponse.json(
      { error: "S3 storage is not configured" },
      { status: 503 },
    );
  }

  const parsed = uploadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Επιτρέπονται αρχεία PDF ή EPUB έως 200 MB.",
      },
      { status: 400 },
    );
  }

  const { publicationId, filename, mime, size } = parsed.data;
  const expectedExtension =
    mime === "application/pdf" ? ".pdf" : ".epub";
  if (!filename.toLocaleLowerCase("en").endsWith(expectedExtension)) {
    return NextResponse.json(
      { error: `Το αρχείο πρέπει να είναι ${expectedExtension}.` },
      { status: 400 },
    );
  }

  const key = `publications/${publicationId}/files/${crypto.randomUUID()}-${safeFilename(filename)}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mime,
    ContentLength: size,
  });
  const url = await getSignedUrl(s3, command, {
    expiresIn: 5 * 60,
  });

  return NextResponse.json({
    url,
    key,
    contentType: mime,
    maxBytes: MAX_FILE_BYTES,
  });
}

export async function DELETE(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;
  if (!BUCKET) {
    return NextResponse.json(
      { error: "S3 storage is not configured" },
      { status: 503 },
    );
  }

  const parsed = deleteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid file request" },
      { status: 400 },
    );
  }

  const prefix = `publications/${parsed.data.publicationId}/files/`;
  if (!parsed.data.key.startsWith(prefix)) {
    return NextResponse.json(
      { error: "Invalid file key" },
      { status: 400 },
    );
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: parsed.data.key,
    }),
  );
  return NextResponse.json({ ok: true });
}
