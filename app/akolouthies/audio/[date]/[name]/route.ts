export const runtime = "nodejs";

import { Readable } from "node:stream";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandOutput,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";
import {
  akolouthiesContentType,
  displayAkolouthiesFilename,
  isAkolouthiesAudioKey,
} from "@/lib/akolouthies";

async function findAudioKey(date: string, name: string) {
  const year = date.slice(0, 4);
  const prefix = `Ακολουθίες/${year}/${date}/podcasts/`;
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
      return isAkolouthiesAudioKey(key) && displayAkolouthiesFilename(key) === name;
    });

    if (match?.Key) return match.Key;
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return null;
}

function buildHeaders(name: string, key: string, res: GetObjectCommandOutput) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", res.ContentType || akolouthiesContentType(key));
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
  { params }: { params: Promise<{ date: string; name: string }> }
) {
  const { date, name } = await params;
  const key = await findAudioKey(date, name);

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
