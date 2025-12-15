export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type Body = {
  id?: string;
  publicId?: string;
  resourceType?: "image" | "video";
  type?: "image" | "video";
};

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
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const id = body.id || body.publicId;
  const resourceType = body.resourceType || body.type;

  if (!id || (resourceType !== "image" && resourceType !== "video")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const url = new URL(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`
  );
  url.searchParams.append("public_ids[]", id);
  url.searchParams.set("invalidate", "true");

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const msg = json?.error?.message || json?.error || "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: json });
}
