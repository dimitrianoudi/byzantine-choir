export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

type Item = {
  key: string;
  name: string;
  lastModified?: string;
  size?: number;
};

function isAudioKey(key: string) {
  const k = key.toLowerCase();
  return k.endsWith(".mp3") || k.endsWith(".m4a") || k.endsWith(".aac");
}

function filename(key: string) {
  return key.split("/").pop() || key;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = url.searchParams.get("year") || String(new Date().getFullYear());
  const date = url.searchParams.get("date") || "";

  const yearPrefix = `Ακολουθίες/${year}/`;

  try {
    let selectedDate = date;

    if (!selectedDate) {
      const cmd = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: yearPrefix,
        Delimiter: "/",
        MaxKeys: 1000,
      });

      const res = (await s3.send(cmd)) as ListObjectsV2CommandOutput;
      const folders = (res.CommonPrefixes || [])
        .map((p) => p.Prefix || "")
        .filter(Boolean)
        .map((p) => p.replace(yearPrefix, "").replace(/\/$/, ""))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

      folders.sort();
      selectedDate = folders[folders.length - 1] || "";
    }

    if (!selectedDate) {
      return NextResponse.json({ year, date: "", items: [], dates: [] });
    }

    const podcastsPrefix = `Ακολουθίες/${year}/${selectedDate}/podcasts/`;

    const listDatesCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: yearPrefix,
      Delimiter: "/",
      MaxKeys: 1000,
    });
    const listDatesRes = (await s3.send(listDatesCmd)) as ListObjectsV2CommandOutput;
    const dates = (listDatesRes.CommonPrefixes || [])
      .map((p) => p.Prefix || "")
      .filter(Boolean)
      .map((p) => p.replace(yearPrefix, "").replace(/\/$/, ""))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse();

    const items: Item[] = [];
    let token: string | undefined;

    do {
      const cmd = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: podcastsPrefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      });

      const res = (await s3.send(cmd)) as ListObjectsV2CommandOutput;

      for (const o of res.Contents || []) {
        if (!o.Key) continue;
        if (!isAudioKey(o.Key)) continue;

        items.push({
          key: o.Key,
          name: filename(o.Key),
          size: o.Size ?? undefined,
          lastModified: o.LastModified ? new Date(o.LastModified).toISOString() : undefined,
        });
      }

      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);

    items.sort((a, b) => (b.lastModified || "").localeCompare(a.lastModified || ""));

    return NextResponse.json({
      year,
      date: selectedDate,
      items,
      dates,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "List failed" }, { status: 500 });
  }
}
