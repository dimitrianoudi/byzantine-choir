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

function isHiddenSystemPrefix(fullPrefix: string, currentPrefix: string) {
  const relative = fullPrefix.slice((currentPrefix || "").length);
  const firstSegment = relative.split("/").filter(Boolean)[0] || "";
  return firstSegment.startsWith("_");
}

function normalizeSearchText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function searchTermsFromQuery(query: string) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function matchesSearch(key: string, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = normalizeSearchText(key);
  return terms.every((term) => haystack.includes(term));
}

function scoreSearchMatch(key: string, terms: string[]) {
  if (terms.length === 0) return 0;
  const name = normalizeSearchText(key.split("/").pop() || key);
  const fullKey = normalizeSearchText(key);

  return terms.reduce((score, term) => {
    if (name === term) return score + 100;
    if (name.startsWith(term)) return score + 50;
    if (name.includes(term)) return score + 20;
    if (fullKey.includes(term)) return score + 5;
    return score;
  }, 0);
}

function getSearchPrefixes(type: "podcast" | "pdf" | null) {
  if (type === "pdf") return ["Μαθήματα/", "pdfs/"];
  if (type === "podcast") return ["Μαθήματα/", "Ακολουθίες/", "podcasts/"];
  return [undefined];
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? "";
  const query = (url.searchParams.get("q") ?? "").trim();
  const rawType = url.searchParams.get("type");
  const typeFilter = rawType === "pdf" || rawType === "podcast" ? rawType : null;
  const queryTerms = searchTermsFromQuery(query);
  const isSearch = queryTerms.length > 0;

  try {
    const items: {
      key: string;
      name: string;
      size?: number;
      lastModified?: string;
      type: "podcast" | "pdf";
    }[] = [];

    const folders: string[] = [];
    const prefixesToScan = isSearch ? getSearchPrefixes(typeFilter) : [prefix || undefined];

    for (const scanPrefix of prefixesToScan) {
      let continuationToken: string | undefined = undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: scanPrefix,
          Delimiter: isSearch ? undefined : "/",
          ContinuationToken: continuationToken,
        });

        const res = (await s3.send(command)) as ListObjectsV2CommandOutput;

        if (!isSearch) {
          for (const cp of res.CommonPrefixes ?? []) {
            if (!cp.Prefix) continue;
            if (isHiddenSystemPrefix(cp.Prefix, prefix)) continue;
            if (!folders.includes(cp.Prefix)) {
              folders.push(cp.Prefix);
            }
          }
        }

        for (const obj of res.Contents ?? []) {
          if (!obj.Key) continue;
          if (obj.Key.endsWith("/")) continue;

          const type = inferType(obj.Key);
          if (!type) continue;
          if (typeFilter && type !== typeFilter) continue;
          if (isSearch && !matchesSearch(obj.Key, queryTerms)) continue;

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
    }

    items.sort((a, b) => {
      if (isSearch) {
        const scoreDiff = scoreSearchMatch(b.key, queryTerms) - scoreSearchMatch(a.key, queryTerms);
        if (scoreDiff !== 0) return scoreDiff;
      }
      return (b.lastModified || "").localeCompare(a.lastModified || "");
    });

    return NextResponse.json({ items, folders, prefix, query });
  } catch (err: any) {
    console.error("LIST_FILES_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error", items: [], folders: [], prefix, query },
      { status: 500 }
    );
  }
}
