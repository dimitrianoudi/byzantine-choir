export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET, s3 } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  canAccessStudentTest,
  getStudentTestStudent,
  isStudentTestGroup,
  isStudentTestsAdmin,
  studentTestBasePrefix,
  type StudentTestGroup,
} from "@/lib/studentTests";

type UploadKind = "score" | "student-recording" | "teacher-feedback";

function sanitizeFilename(name: string) {
  const sanitized = String(name)
    .normalize("NFC")
    .trim()
    .replace(/\//g, "_")
    .replace(/[\u0000-\u001F]/g, "_")
    .replace(/[<>:"\\|?*]/g, "_")
    .replace(/\s+/g, " ");

  return sanitized || "recording.webm";
}

function isUploadKind(value: unknown): value is UploadKind {
  return value === "score" || value === "student-recording" || value === "teacher-feedback";
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
  const group = typeof b.group === "string" && isStudentTestGroup(b.group) ? b.group : null;
  const kind = isUploadKind(b.kind) ? b.kind : null;
  const filename = typeof b.filename === "string" ? sanitizeFilename(b.filename) : "";
  const mime = typeof b.mime === "string" ? b.mime : "";

  if (!group || !kind || !filename || !mime) {
    return NextResponse.json({ error: "Missing upload details" }, { status: 400 });
  }

  const isAdmin = isStudentTestsAdmin(session.user?.role, session.user?.email);
  if ((kind === "score" || kind === "teacher-feedback") && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (kind === "score" && !mime.startsWith("image/")) {
    return NextResponse.json({ error: "Score upload must be an image" }, { status: 400 });
  }

  if (kind !== "score" && !mime.startsWith("audio/")) {
    return NextResponse.json({ error: "Recording upload must be audio" }, { status: 400 });
  }

  const studentId = typeof b.studentId === "string" ? b.studentId : "";
  if (kind !== "score" && !getStudentTestStudent(group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  if (
    kind === "student-recording" &&
    !canAccessStudentTest(session.user?.role, session.user?.email, group as StudentTestGroup, studentId)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const base = studentTestBasePrefix(group as StudentTestGroup);
  const folder =
    kind === "score"
      ? `${base}/score`
      : `${base}/students/${studentId}/${kind === "student-recording" ? "sample" : "feedback"}`;
  const key = `${folder}/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mime,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return NextResponse.json({ url, key, contentType: mime });
}
