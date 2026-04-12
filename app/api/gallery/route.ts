export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  GALLERY_CACHE_TTL_MS,
  getGalleryCacheKey,
  readGalleryCache,
  writeGalleryCache,
} from "@/lib/galleryCache";

type CloudinaryResource = {
  public_id: string;
  resource_type: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
};

type GalleryItem = {
  id: string;
  publicId: string;
  type: "image" | "video";
  src: string;
  thumb: string;
  width?: number;
  height?: number;
  format?: string;
  duration: number | null;
};

type GalleryResponseBody = {
  items: GalleryItem[];
  folders: string[];
  _debug?: Record<string, unknown>;
};

function imageUrl(cloudName: string, publicId: string, transform: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

function withImageThumb(cloudName: string, publicId: string) {
  return imageUrl(cloudName, publicId, "c_limit,w_600,q_auto,f_auto");
}

function withImageFull(cloudName: string, publicId: string) {
  return imageUrl(cloudName, publicId, "c_fit,w_2200,h_2200,q_auto,f_auto");
}

function videoPosterUrl(cloudName: string, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,c_fill,w_600,q_auto,f_jpg/${publicId}.jpg`;
}

function mergeUniqueResources(...lists: CloudinaryResource[][]) {
  const seenIds = new Set<string>();
  const merged: CloudinaryResource[] = [];
  for (const list of lists) {
    for (const resource of list) {
      const id = resource.public_id ?? "";
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      merged.push(resource);
    }
  }
  return merged;
}

async function listResources(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: "image" | "video";
  prefix?: string;
}): Promise<CloudinaryResource[]> {
  const { cloudName, apiKey, apiSecret, resourceType, prefix = "" } = opts;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const params = new URLSearchParams({ max_results: "500" });
  if (prefix) params.set("prefix", prefix);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(msg || "Cloudinary list failed");
  }

  const raw =
    (json as { resources?: CloudinaryResource[] }).resources ??
    (json as { assets?: CloudinaryResource[] }).assets ??
    (json as { result?: { resources?: CloudinaryResource[] } }).result?.resources;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r: Record<string, unknown>) => ({
    public_id: (r.public_id ?? r.publicId ?? "") as string,
    resource_type: (r.resource_type ?? r.type ?? resourceType) as string,
    secure_url: ((r.secure_url ?? r.url) as string) || "",
    width: r.width as number | undefined,
    height: r.height as number | undefined,
    format: r.format as string | undefined,
    duration: r.duration as number | undefined,
  }));
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
  const refresh = searchParams.get("refresh") === "1";
  const cacheKey = getGalleryCacheKey(folder, debug);
  const cacheControl =
    debug || refresh
      ? "no-store"
      : `private, max-age=${Math.floor(GALLERY_CACHE_TTL_MS / 1000)}, stale-while-revalidate=300`;

  if (!debug && !refresh) {
    const cached = readGalleryCache<GalleryResponseBody>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": cacheControl },
      });
    }
  }

  try {
    const folderPrefix = folder.endsWith("/") ? folder : `${folder}/`;
    const [imgsFromPrimary, vidsFromPrimary, apiFolderNames] = await Promise.all([
      listResources({ cloudName, apiKey, apiSecret, resourceType: "image", prefix: folderPrefix }),
      listResources({ cloudName, apiKey, apiSecret, resourceType: "video", prefix: folderPrefix }),
      listSubfolderNames({ cloudName, apiKey, apiSecret, folderPath: folder }),
    ]);

    let allResources = mergeUniqueResources(imgsFromPrimary, vidsFromPrimary);

    // Legacy root uploads may not include the gallery folder in their public_id.
    if (allResources.length === 0 && folder === root) {
      const [rootImgs, rootVids] = await Promise.all([
        listResources({ cloudName, apiKey, apiSecret, resourceType: "image" }),
        listResources({ cloudName, apiKey, apiSecret, resourceType: "video" }),
      ]);
      allResources = mergeUniqueResources(allResources, rootImgs, rootVids);
    }

    const subfolderSet = new Set<string>(apiFolderNames);
    for (const r of allResources) {
      const id = r.public_id ?? "";
      if (!id) continue;
      const inCurrentFolder =
        folder === root ? !id.includes("/") || id.startsWith(folderPrefix) : id.startsWith(folderPrefix);
      if (!inCurrentFolder) continue;
      const after = folder === root && !id.startsWith(folderPrefix) ? id : id.slice(folderPrefix.length);
      const segment = after.split("/")[0];
      if (segment && after !== segment) subfolderSet.add(segment);
    }
    const folders = Array.from(subfolderSet).sort();

    const items = allResources
      .filter((r) => {
        const id = r.public_id ?? "";
        if (!id) return false;
        return folder === root
          ? !id.includes("/") || id.startsWith(folderPrefix)
          : id.startsWith(folderPrefix);
      })
      .map<GalleryItem>((r) => {
        const isVideo = r.resource_type === "video";
        return {
          id: r.public_id,
          publicId: r.public_id,
          type: isVideo ? "video" : "image",
          src: isVideo ? r.secure_url : withImageFull(cloudName, r.public_id),
          thumb: isVideo ? videoPosterUrl(cloudName, r.public_id) : withImageThumb(cloudName, r.public_id),
          width: r.width,
          height: r.height,
          format: r.format,
          duration: r.duration ?? null,
        };
      })
      .sort((a, b) => (a.id < b.id ? 1 : -1));

    const body: GalleryResponseBody = { items, folders };
    if (debug) {
      let noPrefixCount = 0;
      let noPrefixSample: string[] = [];
      try {
        const noPrefixImgs = await listResources({
          cloudName,
          apiKey,
          apiSecret,
          resourceType: "image",
        });
        noPrefixCount = noPrefixImgs.length;
        noPrefixSample = noPrefixImgs.slice(0, 5).map((r) => r.public_id);
      } catch (_) {
        noPrefixCount = -1;
      }
      body._debug = {
        prefixParam,
        prefixNorm,
        folder,
        folderPrefix,
        refresh,
        rawImageCount: imgsFromPrimary.length,
        rawVideoCount: vidsFromPrimary.length,
        rawTotal: allResources.length,
        itemsReturned: items.length,
        samplePublicIds: allResources.slice(0, 10).map((r) => r.public_id),
        noPrefixCount,
        noPrefixSample,
      };
    }

    if (!debug) {
      writeGalleryCache(cacheKey, body);
    }

    return NextResponse.json(body, {
      headers: { "Cache-Control": cacheControl },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Load failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
