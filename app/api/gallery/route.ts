export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import crypto from "crypto";

type CloudinaryResourceType = "image" | "video";

function authHeader(apiKey: string, apiSecret: string) {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${token}`;
}

function sign(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

async function listResources(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: CloudinaryResourceType;
  prefix: string;
}) {
  const { cloudName, apiKey, apiSecret, resourceType, prefix } = opts;

  const items: any[] = [];
  let nextCursor: string | undefined;

  do {
    const u = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}`);
    u.searchParams.set("prefix", prefix);
    u.searchParams.set("max_results", "200");
    if (nextCursor) u.searchParams.set("next_cursor", nextCursor);

    const res = await fetch(u.toString(), {
      headers: { Authorization: authHeader(apiKey, apiSecret) },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || "Cloudinary list failed");

    items.push(...(Array.isArray(json?.resources) ? json.resources : []));
    nextCursor = typeof json?.next_cursor === "string" ? json.next_cursor : undefined;
  } while (nextCursor);

  return items;
}

async function listFolders(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  prefix: string;
}) {
  const { cloudName, apiKey, apiSecret, prefix } = opts;

  const base = `https://api.cloudinary.com/v1_1/${cloudName}/folders`;
  const url = prefix ? `${base}/${encodeURIComponent(prefix.replace(/\/$/, ""))}` : base;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(apiKey, apiSecret) },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.error?.message || "Cloudinary folders failed";
    if (String(msg).toLowerCase().includes("not found")) return [];
    throw new Error(msg);
  }

  const folders = Array.isArray(json?.folders) ? json.folders : [];
  return folders
    .map((f: any) => (typeof f?.path === "string" ? f.path : null))
    .filter(Boolean) as string[];
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const root = (process.env.CLOUDINARY_GALLERY_FOLDER || "gallery").replace(/\/$/, "");

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  const url = new URL(req.url);
  const rawPrefix = url.searchParams.get("prefix") || "";
  const prefix = rawPrefix ? rawPrefix.replace(/^\/+/, "").replace(/\/?$/, "/") : `${root}/`;

  try {
    const [images, videos, folders] = await Promise.all([
      listResources({ cloudName, apiKey, apiSecret, resourceType: "image", prefix }),
      listResources({ cloudName, apiKey, apiSecret, resourceType: "video", prefix }),
      listFolders({ cloudName, apiKey, apiSecret, prefix: prefix.replace(/\/$/, "") }),
    ]);

    const mapped = [
      ...images.map((r: any) => ({
        id: String(r.asset_id || r.public_id),
        publicId: String(r.public_id),
        type: "image" as const,
        src: String(r.secure_url),
        thumb: String(r.secure_url),
        width: r.width,
        height: r.height,
        format: r.format,
        duration: null,
        createdAt: r.created_at,
      })),
      ...videos.map((r: any) => ({
        id: String(r.asset_id || r.public_id),
        publicId: String(r.public_id),
        type: "video" as const,
        src: String(r.secure_url),
        thumb: String(r.secure_url),
        width: r.width,
        height: r.height,
        format: r.format,
        duration: r.duration ?? null,
        createdAt: r.created_at,
      })),
    ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return NextResponse.json({ items: mapped, folders, prefix });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error", items: [], folders: [], prefix }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const b = body as Record<string, unknown>;

  const publicId = typeof b.publicId === "string" ? b.publicId : "";
  const resourceType = (typeof b.resourceType === "string" ? b.resourceType : "image") as CloudinaryResourceType;

  if (!publicId) return NextResponse.json({ error: "Missing publicId" }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp: String(timestamp) }, apiSecret);

  const form = new URLSearchParams();
  form.set("public_id", publicId);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: json?.error?.message || "Delete failed" }, { status: 500 });

  if (json?.result !== "ok" && json?.result !== "not found") {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
