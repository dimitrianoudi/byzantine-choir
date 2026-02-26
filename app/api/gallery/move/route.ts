export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type Body = {
  fromPublicId?: string;
  toFolder?: string;
  resourceType?: "image" | "video";
};

function sanitizeFolder(s: string) {
  const v = String(s || "").trim().replace(/^\/+|\/+$/g, "");
  return v;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch {}

  const fromPublicId = typeof body.fromPublicId === "string" ? body.fromPublicId : "";
  const toFolder = typeof body.toFolder === "string" ? sanitizeFolder(body.toFolder) : "";
  const resourceType = body.resourceType;

  if (!fromPublicId || !toFolder || (resourceType !== "image" && resourceType !== "video")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const base = fromPublicId.split("/").pop() || fromPublicId;
  const toPublicId = `${toFolder}/${base}`;

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/rename`;

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from_public_id: fromPublicId,
      to_public_id: toPublicId,
      overwrite: false,
      invalidate: true,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const msg = json?.error?.message || json?.error || "Move failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, toPublicId, result: json });
}