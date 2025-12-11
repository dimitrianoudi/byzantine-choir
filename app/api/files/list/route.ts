export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { getSession } from "@/lib/session";

function inferType(key: string): "podcast" | "pdf" | null {
  const lower = key.toLowerCase();

  if (lower.includes("/pdfs/") || lower.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lower.includes("/podcasts/") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".m4a") ||
    lower.endsWith(".aac")
  ) {
    return "podcast";
  }

  return null;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? "";

  try {
    const items: {
      key: string;
      name: string;
      size?: number;
      lastModified?: string;
      type: "podcast" | "pdf";
    }[] = [];

    const folders: string[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix || undefined,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      });

      const res = (await s3.send(command)) as ListObjectsV2CommandOutput;

      for (const cp of res.CommonPrefixes ?? []) {
        if (!cp.Prefix) continue;
        if (!folders.includes(cp.Prefix)) {
          folders.push(cp.Prefix);
        }
      }

      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue;
        if (obj.Key.endsWith("/")) continue;

        const type = inferType(obj.Key);
        if (!type) continue;

        const name = obj.Key.split("/").pop() || obj.Key;

        items.push({
          key: obj.Key,
          name,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          type,
        });
      }

      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);

    items.sort((a, b) =>
      (b.lastModified || "").localeCompare(a.lastModified || "")
    );

    return NextResponse.json({ items, folders, prefix });
  } catch (err: any) {
    console.error("LIST_FILES_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error", items: [], folders: [], prefix },
      { status: 500 }
    );
  }
}
