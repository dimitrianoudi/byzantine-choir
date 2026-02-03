export const runtime = "nodejs";

import { NextResponse } from "next/server";

type CloudinaryResource = {
  public_id: string;
  resource_type: string;
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

/** List resources by prefix using Cloudinary REST Admin API (no SDK). */
async function listResourcesByPrefix(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: "image" | "video";
  folder: string;
}): Promise<CloudinaryResource[]> {
  const { cloudName, apiKey, apiSecret, resourceType, folder } = opts;
  const listPrefix = folder.endsWith("/") ? folder : `${folder}/`;
  const params = new URLSearchParams({
    type: "upload",
    prefix: listPrefix,
    max_results: "500",
  });
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload?${params.toString()}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(msg || "Cloudinary list failed");
  }

  const resources = (json as { resources?: CloudinaryResource[] }).resources ?? [];
  return resources;
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
  const debug = searchParams.get("_debug") === "1";

  try {
    const listPrefixes: string[] = [folder.endsWith("/") ? folder : `${folder}/`];
    if (prefixNorm && folder !== prefixNorm) {
      const relativePrefix = prefixNorm.endsWith("/") ? prefixNorm : `${prefixNorm}/`;
      listPrefixes.push(relativePrefix);
    }

    const [imgsFromPrimary, vidsFromPrimary, imgsFromFallback, vidsFromFallback, apiFolderNames] = await Promise.all([
      listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "image", folder: listPrefixes[0]!.replace(/\/$/, "") }),
      listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "video", folder: listPrefixes[0]!.replace(/\/$/, "") }),
      listPrefixes.length > 1
        ? listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "image", folder: listPrefixes[1]!.replace(/\/$/, "") })
        : Promise.resolve([] as CloudinaryResource[]),
      listPrefixes.length > 1
        ? listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "video", folder: listPrefixes[1]!.replace(/\/$/, "") })
        : Promise.resolve([] as CloudinaryResource[]),
      listSubfolderNames({ cloudName, apiKey, apiSecret, folderPath: folder }),
    ]);

    const seenIds = new Set<string>();
    const allResources: CloudinaryResource[] = [];
    for (const r of [...imgsFromPrimary, ...vidsFromPrimary, ...imgsFromFallback, ...vidsFromFallback]) {
      const id = r.public_id ?? "";
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        allResources.push(r);
      }
    }

    const folderPrefix = folder.endsWith("/") ? folder : `${folder}/`;
    const subfolderSet = new Set<string>(apiFolderNames);
    for (const r of allResources) {
      const id = r.public_id ?? "";
      if (!id) continue;
      const prefixUsed = id.startsWith(folderPrefix) ? folderPrefix : (listPrefixes[1] ?? folderPrefix);
      if (!id.startsWith(prefixUsed)) continue;
      const after = id.slice(prefixUsed.length);
      const segment = after.split("/")[0];
      if (segment && after !== segment) subfolderSet.add(segment);
    }
    const folders = Array.from(subfolderSet).sort();

    const items = allResources
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

    const body: Record<string, unknown> = { items, folders };
    if (debug) {
      body._debug = {
        prefixParam,
        prefixNorm,
        folder,
        listPrefixes,
        imageCount: imgsFromPrimary.length + imgsFromFallback.length,
        videoCount: vidsFromPrimary.length + vidsFromFallback.length,
        itemsReturned: items.length,
      };
    }
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Load failed" }, { status: 500 });
  }
}
