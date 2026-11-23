export const runtime = "nodejs";

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  rejectUnsafeMutationOrigin,
  requirePublicationAdmin,
} from "@/lib/publications/admin";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const requestSchema = z.object({
  publicationId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/),
  filename: z.string().trim().min(1).max(240),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

function sign(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");
}

export async function POST(request: Request) {
  const unauthorized = await requirePublicationAdmin();
  if (unauthorized) return unauthorized;
  const unsafeOrigin = rejectUnsafeMutationOrigin(request);
  if (unsafeOrigin) return unsafeOrigin;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary env missing" },
      { status: 503 },
    );
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Επιτρέπονται εικόνες JPG, PNG ή WebP έως 15 MB.",
      },
      { status: 400 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `publications/${parsed.data.publicationId}/${timestamp}-${crypto.randomUUID()}`;
  const params = {
    public_id: publicId,
    timestamp: String(timestamp),
  };

  return NextResponse.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    cloudName,
    apiKey,
    timestamp,
    publicId,
    signature: sign(params, apiSecret),
    maxBytes: MAX_IMAGE_BYTES,
  });
}
