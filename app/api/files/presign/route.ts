export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { s3, BUCKET, presignGet } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const courseMap = {
  kids: "Ψαλτική παιδικής φωνής",
  women: "Ψαλτική γυναικείας φωνής",
  men: "Ψαλτική ανδρικής φωνής",
} as const;

type CourseKey = keyof typeof courseMap;
type Kind = "podcast" | "pdf";

function sanitizeFilename(name: string): string {
  return String(name).replace(/[^\w\d\-_.]+/g, "_");
}
function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (b?.key && !b?.filename && !b?.mime && !b?.type) {
    try {
      const url = await presignGet(String(b.key), 60 * 60);
      return NextResponse.json({ url, key: b.key });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
  }

  const filename = typeof b?.filename === "string" ? b.filename : undefined;
  const mime = typeof b?.mime === "string" ? b.mime : (typeof b?.type === "string" ? b.type : undefined);

  if (!filename || !mime) {
    return NextResponse.json(
      { error: "Invalid body. Use { key } for download or { filename, mime } for upload." },
      { status: 400 }
    );
  }

  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const safe = sanitizeFilename(filename);
    const explicitKind = (b?.kind as Kind | undefined);
    const kind: Kind = explicitKind ?? (mime === "application/pdf" ? "pdf" : "podcast");
    const typeFolder = kind === "pdf" ? "pdfs" : "podcasts";

    const series = typeof b?.series === "string" ? b.series : undefined;

    let key = "";

    if (series === "akolouthies") {
      const year = Number(b?.year);
      const date = typeof b?.date === "string" ? b.date : "";
      if (!year || !isIsoDate(date)) {
        return NextResponse.json({ error: "Invalid year/date for Ακολουθίες" }, { status: 400 });
      }
      key = `Ακολουθίες/${year}/${date}/${typeFolder}/${Date.now()}-${safe}`;
    } else {
      const course = b?.course as CourseKey | undefined;
      const year = Number(b?.year);
      const lesson = Number(b?.lesson);

      if (course && courseMap[course] && year && lesson) {
        const courseFolder = courseMap[course];
        const lessonStr = String(lesson).padStart(2, "0");
        key = `μαθήματα/${courseFolder}/${year}/Μάθημα ${lessonStr}/${typeFolder}/${Date.now()}-${safe}`;
      } else {
        const legacyPrefix = mime === "application/pdf" ? "pdfs" : "podcasts";
        key = `${legacyPrefix}/${Date.now()}-${safe}`;
      }
    }

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mime,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    return NextResponse.json({ url, key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
