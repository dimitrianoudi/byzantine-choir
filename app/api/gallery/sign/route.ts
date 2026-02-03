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
  const prefixNorm = folderFromClient.replace(/^\/+/, "").replace(/\/$/, "");
  const folder = prefixNorm ? `${root}/${prefixNorm}/` : `${root}/`;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ folder, timestamp: String(timestamp) }, apiSecret);

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    cloudName,
    apiKey,
  });
}
