export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  _Object as S3Object,
  CommonPrefix as S3CommonPrefix,
} from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { getSession } from "@/lib/session";

type ItemType = "podcast" | "pdf";

type ApiItem = {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
  type: ItemType;
};

function inferType(key: string): ItemType | null {
  const k = key.toLowerCase();
  if (k.includes("/pdfs/") || k.endsWith(".pdf")) return "pdf";
  if (
    k.includes("/podcasts/") ||
    k.endsWith(".mp3") ||
    k.endsWith(".m4a") ||
    k.endsWith(".aac")
  ) return "podcast";
  return null;
}

function filename(key: string): string {
  return key.split("/").pop() || key;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? "";

  try {
    const items: ApiItem[] = [];
    const folders: string[] = [];

    let continuationToken: string | undefined = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix || undefined,
        Delimiter: "/",
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const res = (await s3.send(command)) as ListObjectsV2CommandOutput;

      // Folders (CommonPrefixes)
      for (const cp of (res.CommonPrefixes as S3CommonPrefix[] | undefined) ?? []) {
        if (!cp.Prefix) continue;
        if (!folders.includes(cp.Prefix)) folders.push(cp.Prefix);
      }

      // Files (Contents)
      for (const obj of (res.Contents as S3Object[] | undefined) ?? []) {
        const key = obj.Key;
        if (!key) continue;

        // Ignore directory placeholder keys
        if (key.endsWith("/")) continue;
        // Ignore the "prefix object" itself if returned
        if (prefix && key === prefix) continue;

        const type = inferType(key);
        if (!type) continue;

        items.push({
          key,
          name: filename(key),
          size: obj.Size ?? undefined,
          lastModified: obj.LastModified
            ? new Date(obj.LastModified).toISOString()
            : undefined,
          type,
        });
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    // Sort newest first
    items.sort((a, b) => (b.lastModified || "").localeCompare(a.lastModified || ""));

    return NextResponse.json({ items, folders, prefix });
  } catch (err: any) {
    console.error("LIST_FILES_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error", items: [], folders: [], prefix },
      { status: 500 }
    );
  }
}
