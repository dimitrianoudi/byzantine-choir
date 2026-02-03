export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import crypto from "crypto";

function sign(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
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

  const folderFromClient = typeof b.folder === "string" ? b.folder : "";
  const publicIdFromClient = typeof b.public_id === "string" ? b.public_id : "";
  const prefixNorm = folderFromClient.replace(/^\/+/, "").replace(/\/$/, "");
  const folder = prefixNorm ? `${root}/${prefixNorm}/` : `${root}/`;

  const timestamp = Math.floor(Date.now() / 1000);

  // Use public_id that includes folder path so list-by-prefix works (folder param stores path separately and public_id stays short)
  const public_id = publicIdFromClient || (prefixNorm ? `${root}/${prefixNorm}/${timestamp}-${Math.random().toString(36).slice(2, 10)}` : `${root}/${timestamp}-${Math.random().toString(36).slice(2, 10)}`);
  const signature = sign({ public_id, timestamp: String(timestamp) }, apiSecret);

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    public_id,
    cloudName,
    apiKey,
  });
}
