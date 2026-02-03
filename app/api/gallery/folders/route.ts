export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function authHeader(apiKey: string, apiSecret: string) {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const root = (process.env.CLOUDINARY_GALLERY_FOLDER || "gallery").replace(/\/$/, "");

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Missing folder name" }, { status: 400 });

  const prefixFromClient = typeof b.prefix === "string" ? b.prefix : "";
  const prefixNorm = prefixFromClient.replace(/^\/+/, "").replace(/\/$/, "");
  const pathParts = [root, prefixNorm, name].filter(Boolean);
  const full = pathParts.join("/").replace(/^\/+/, "");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodeURIComponent(full)}`, {
    method: "POST",
    headers: { Authorization: authHeader(apiKey, apiSecret) },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: json?.error?.message || "Create folder failed" }, { status: 500 });

  return NextResponse.json({ ok: true, path: full });
}
