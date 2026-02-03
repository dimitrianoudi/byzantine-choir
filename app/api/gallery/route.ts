export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

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

/** List resources by prefix using Cloudinary REST Admin API (no SDK). Tries prefix with/without slash; if 0 results, falls back to no-prefix and filters by folder. */
async function listResourcesByPrefix(opts: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: "image" | "video";
  folder: string;
  folderPrefix: string; // e.g. "gallery/" for filtering fallback
}): Promise<CloudinaryResource[]> {
  const { cloudName, apiKey, apiSecret, resourceType, folder, folderPrefix } = opts;
  const withSlash = folder.endsWith("/") ? folder : `${folder}/`;
  const withoutSlash = folder.replace(/\/$/, "");
  const prefixesToTry: string[] = [withSlash];
  if (withoutSlash !== withSlash) prefixesToTry.push(withoutSlash);

  const seenIds = new Set<string>();
  const all: CloudinaryResource[] = [];
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const doFetch = async (prefix: string): Promise<CloudinaryResource[]> => {
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
    // Cloudinary may return resources in different keys
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
  };

  for (const listPrefix of prefixesToTry) {
    try {
      const resources = await doFetch(listPrefix);
      for (const r of resources) {
        const id = r.public_id ?? "";
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          all.push(r);
        }
      }
    } catch (_err) {
      if (listPrefix === withSlash) throw _err;
    }
  }

  // If prefix-based list returned nothing, try listing everything and filter by folder (handles accounts where prefix doesn't match)
  if (all.length === 0 && folderPrefix) {
    try {
      const resources = await doFetch("");
      const folderNoSlash = folder.replace(/\/$/, "");
      for (const r of resources) {
        const id = r.public_id ?? "";
        const underFolder = id === folderNoSlash || id.startsWith(folderPrefix) || id.startsWith(folderNoSlash + "/");
        if (id && underFolder && !seenIds.has(id)) {
          seenIds.add(id);
          all.push(r);
        }
      }
    } catch (_e) {
      // ignore no-prefix fallback errors
    }
  }

  // Last resort: use Cloudinary SDK (different auth/URL handling)
  if (all.length === 0) {
    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      const listPrefix = folder ? (folder.endsWith("/") ? folder : `${folder}/`) : "";
      const opts = {
        type: "upload" as const,
        resource_type: resourceType,
        prefix: listPrefix || undefined,
        max_results: 500,
      };
      const result = await new Promise<{ resources?: CloudinaryResource[] }>((resolve, reject) => {
        cloudinary.api.resources(opts, (err: unknown, res: { resources?: CloudinaryResource[] }) => {
          if (err) reject(err);
          else resolve(res ?? {});
        });
      });
      const sdkList = result?.resources ?? [];
      for (const r of sdkList) {
        const id = r.public_id ?? "";
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          all.push(r);
        }
      }
    } catch (_sdkErr) {
      // ignore
    }
  }

  return all;
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
    const folderPrefix = folder.endsWith("/") ? folder : `${folder}/`;
    const listPrefixes: string[] = [folderPrefix];
    if (prefixNorm && folder !== prefixNorm) {
      const relativePrefix = prefixNorm.endsWith("/") ? prefixNorm : `${prefixNorm}/`;
      listPrefixes.push(relativePrefix);
    }

    const [imgsFromPrimary, vidsFromPrimary, imgsFromFallback, vidsFromFallback, apiFolderNames] = await Promise.all([
      listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "image", folder: folder.replace(/\/$/, ""), folderPrefix }),
      listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "video", folder: folder.replace(/\/$/, ""), folderPrefix }),
      listPrefixes.length > 1
        ? listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "image", folder: listPrefixes[1]!.replace(/\/$/, ""), folderPrefix })
        : Promise.resolve([] as CloudinaryResource[]),
      listPrefixes.length > 1
        ? listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "video", folder: listPrefixes[1]!.replace(/\/$/, ""), folderPrefix })
        : Promise.resolve([] as CloudinaryResource[]),
      listSubfolderNames({ cloudName, apiKey, apiSecret, folderPath: folder }),
    ]);

    let allResources: CloudinaryResource[] = [];
    const seenIds = new Set<string>();
    for (const r of [...imgsFromPrimary, ...vidsFromPrimary, ...imgsFromFallback, ...vidsFromFallback]) {
      const id = r.public_id ?? "";
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        allResources.push(r);
      }
    }

    // Existing uploads may have public_id without folder path (folder stored separately). At root, show all.
    if (allResources.length === 0 && folder === root) {
      const [rootImgs, rootVids] = await Promise.all([
        listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "image", folder: "", folderPrefix: " " }),
        listResourcesByPrefix({ cloudName, apiKey, apiSecret, resourceType: "video", folder: "", folderPrefix: " " }),
      ]);
      const rootSeen = new Set<string>();
      for (const r of [...rootImgs, ...rootVids]) {
        const id = r.public_id ?? "";
        if (id && !rootSeen.has(id)) {
          rootSeen.add(id);
          allResources.push(r);
        }
      }
    }

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

    // Show all resources under this folder (no direct-children filter so uploads always appear)
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
      // Diagnostic: list with no prefix to see if API returns anything at all
      let noPrefixCount = 0;
      let noPrefixSample: string[] = [];
      try {
        const noPrefixImgs = await listResourcesByPrefix({
          cloudName,
          apiKey,
          apiSecret,
          resourceType: "image",
          folder: "",
          folderPrefix: "",
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
        listPrefixes,
        rawImageCount: imgsFromPrimary.length + imgsFromFallback.length,
        rawVideoCount: vidsFromPrimary.length + vidsFromFallback.length,
        rawTotal: allResources.length,
        itemsReturned: items.length,
        samplePublicIds: allResources.slice(0, 10).map((r) => r.public_id),
        noPrefixCount,
        noPrefixSample,
      };
    }
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Load failed" }, { status: 500 });
  }
}
