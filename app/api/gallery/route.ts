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
  const listPrefix = folder.endsWith("/") ? folder : `${folder}/`;
  const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`);
  url.searchParams.set("prefix", listPrefix);
  url.searchParams.set("max_results", "500");

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

/** Fetch immediate subfolder names from Cloudinary folders API (includes empty folders). */
async function listSubfolderNames(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPath: string;
}): Promise<string[]> {
  const { cloudName, apiKey, apiSecret, folderPath } = opts;
  const pathEnc = encodeURIComponent(folderPath);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/folders/${pathEnc}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    return [];
  }

  const raw = json?.folders ?? [];
  const folders = Array.isArray(raw) ? raw : [];
  const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
  const names: string[] = [];
  for (const f of folders) {
    const full = typeof f === "string" ? f : (f?.path ?? f?.name ?? "");
    if (!full || typeof full !== "string") continue;
    if (full.startsWith(prefix)) {
      const after = full.slice(prefix.length);
      const segment = after.split("/")[0];
      if (segment && !segment.includes("/")) names.push(segment);
    } else if (!full.includes("/")) {
      names.push(full);
    }
  }
  return names;
}

export async function GET(req: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const root = (process.env.CLOUDINARY_GALLERY_FOLDER || "gallery").replace(/\/$/, "");

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const prefixParam = searchParams.get("prefix") ?? "";
  const prefixNorm = prefixParam.replace(/^\/+/, "").replace(/\/$/, "");
  const folder =
    !prefixNorm ? root : prefixNorm.startsWith(root + "/") || prefixNorm === root ? prefixNorm : `${root}/${prefixNorm}`;

  try {
    const [imgs, vids, apiFolderNames] = await Promise.all([
      listResources({ cloudName, apiKey, apiSecret, resourceType: "image", folder }),
      listResources({ cloudName, apiKey, apiSecret, resourceType: "video", folder }),
      listSubfolderNames({ cloudName, apiKey, apiSecret, folderPath: folder }),
    ]);

    const folderPrefix = folder.endsWith("/") ? folder : `${folder}/`;
    const allResources = [...imgs, ...vids];
    const subfolderSet = new Set<string>(apiFolderNames);
    const directChildIds = new Set<string>();
    for (const r of allResources) {
      const id = r.public_id ?? (r as any).public_id;
      if (!id || typeof id !== "string") continue;
      const normalizedId = id.startsWith("/") ? id.slice(1) : id;
      if (!normalizedId.startsWith(folderPrefix)) continue;
      const after = normalizedId.slice(folderPrefix.length);
      const segment = after.split("/")[0];
      if (segment && after !== segment) {
        subfolderSet.add(segment);
      } else {
        directChildIds.add(id);
      }
    }
    const folders = Array.from(subfolderSet).sort();

    const itemIds = directChildIds.size > 0 ? directChildIds : new Set(allResources.map((r) => r.public_id ?? (r as any).public_id).filter(Boolean));
    const items = allResources
      .filter((r) => itemIds.has(r.public_id ?? (r as any).public_id))
      .map((r) => {
        const isVideo = r.resource_type === "video";
        return {
          id: r.public_id,
          publicId: r.public_id,
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

    return NextResponse.json({ items, folders });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Load failed" }, { status: 500 });
  }
}
