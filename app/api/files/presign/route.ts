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

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body?.key && !body?.filename && !body?.mime && !body?.type) {
    try {
      const url = await presignGet(body.key, 60 * 60); // 1 hour
      return NextResponse.json({ url, key: body.key });
    } catch (err: any) {
      console.error("PRESIGN_GET_ERROR:", err);
      return NextResponse.json(
        { error: err?.message || "Internal error" },
        { status: 500 }
      );
    }
  }

  const filename = body?.filename as string | undefined;
  const mime = (body?.mime || body?.type) as string | undefined; // συμβατότητα με παλιό code

  if (filename && mime) {
    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const safe = String(filename).replace(/[^\w\d\-_.]+/g, "_");

      const explicitKind = body?.kind as "podcast" | "pdf" | undefined;
      const kind: "podcast" | "pdf" =
        explicitKind ?? (mime === "application/pdf" ? "pdf" : "podcast");

      const typeFolder = kind === "pdf" ? "pdfs" : "podcasts";

      const course = body?.course as CourseKey | undefined;
      const year = Number(body?.year);
      const lesson = Number(body?.lesson);

      let key: string;

      if (course && courseMap[course] && year && lesson) {
        const courseFolder = courseMap[course];               // ελληνικό όνομα φακέλου
        const lessonStr = String(lesson).padStart(2, "0");     // 01, 02, ..., 30

        key = `μαθήματα/${courseFolder}/${year}/Μάθημα ${lessonStr}/${typeFolder}/${Date.now()}-${safe}`;
      } else {
        const legacyPrefix = mime === "application/pdf" ? "pdfs" : "podcasts";
        key = `${legacyPrefix}/${Date.now()}-${safe}`;
      }

      const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: mime,
      });

      const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
      return NextResponse.json({ url, key });
    } catch (err: any) {
      console.error("PRESIGN_UPLOAD_ERROR:", err);
      return NextResponse.json(
        { error: err?.message || "Internal error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Invalid body. Use { key } για download ή { filename, mime } (και προαιρετικά course/year/lesson/kind) για upload.",
    },
    { status: 400 }
  );
}
