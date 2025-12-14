export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type CloudinaryResource = {
  public_id: string;
  resource_type: "image" | "video";
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
};

function withImageThumb(url: string) {
  return url.replace("/upload/", "/upload/c_fill,w_600,q_auto,f_auto/");
}

function videoPosterUrl(cloudName: string, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,c_fill,w_600,q_auto,f_jpg/${publicId}.jpg`;
}

async function listResources(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: "image" | "video";
  folder: string;
}) {
  const { cloudName, apiKey, apiSecret, resourceType, folder } = opts;

  const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}`);
  url.searchParams.set("type", "upload");
  url.searchParams.set("prefix", folder.endsWith("/") ? folder : `${folder}/`);
  url.searchParams.set("max_results", "200");

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.error || "Cloudinary list failed");
  }

  return (json?.resources || []) as CloudinaryResource[];
}

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const folder = process.env.CLOUDINARY_GALLERY_FOLDER || "gallery";

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  try {
    const [imgs, vids] = await Promise.all([
      listResources({ cloudName, apiKey, apiSecret, resourceType: "image", folder }),
      listResources({ cloudName, apiKey, apiSecret, resourceType: "video", folder }),
    ]);

    const items = [...imgs, ...vids]
      .map((r) => {
        const isVideo = r.resource_type === "video";
        return {
          id: r.public_id,
          type: isVideo ? "video" : "image",
          src: r.secure_url,
          thumb: isVideo ? videoPosterUrl(cloudName, r.public_id) : withImageThumb(r.secure_url),
          width: r.width,
          height: r.height,
          format: r.format,
          duration: r.duration ?? null,
        };
      })
      .sort((a, b) => (a.id < b.id ? 1 : -1));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Load failed" }, { status: 500 });
  }
}
