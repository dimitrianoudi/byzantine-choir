export const runtime = "nodejs";

import { Readable } from "node:stream";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandOutput,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { BUCKET, s3 } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  displayMaterialFilename,
  getMaterialPodcastPrefix,
  isMaterialAudioKey,
  materialAudioContentType,
} from "@/lib/material";

async function findAudioKey(courseSlug: string, year: string, lesson: string, name: string) {
  const prefix = getMaterialPodcastPrefix(courseSlug, year, lesson);
  if (!prefix) return null;

  let token: string | undefined;

  do {
    const res = (await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    )) as ListObjectsV2CommandOutput;

    const match = (res.Contents || []).find((item) => {
      const key = item.Key || "";
      return isMaterialAudioKey(key) && displayMaterialFilename(key) === name;
    });

    if (match?.Key) return match.Key;
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return null;
}

function buildHeaders(name: string, key: string, res: GetObjectCommandOutput) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", res.ContentType || materialAudioContentType(key));
  headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Robots-Tag", "noindex");

  if (res.ContentLength != null) headers.set("Content-Length", String(res.ContentLength));
  if (res.ContentRange) headers.set("Content-Range", res.ContentRange);
  if (res.ETag) headers.set("ETag", res.ETag);
  if (res.LastModified) headers.set("Last-Modified", res.LastModified.toUTCString());

  return headers;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ parts: string[] }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { parts } = await params;
  if (!Array.isArray(parts) || parts.length !== 4) {
    return new Response("Audio not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const [courseSlug, year, lesson, name] = parts;
  const key = await findAudioKey(courseSlug, year, lesson, name);

  if (!key) {
    return new Response("Audio not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const range = req.headers.get("range") || undefined;
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Range: range,
    })
  );

  if (!res.Body) {
    return new Response("Audio unavailable", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const body = res.Body as any;
  const stream =
    typeof body.transformToWebStream === "function"
      ? body.transformToWebStream()
      : (Readable.toWeb(body) as ReadableStream);

  return new Response(stream, {
    status: range ? 206 : 200,
    headers: buildHeaders(name, key, res),
  });
}
