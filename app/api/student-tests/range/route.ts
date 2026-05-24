export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BUCKET, s3, uploadBuffer } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  canAccessStudentTest,
  getStudentTestStudent,
  isStudentTestGroup,
  studentTestBasePrefix,
  type StudentTestGroup,
} from "@/lib/studentTests";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_RANGES = new Set(["Bass", "Baritone", "Tenor", "Contralto", "Mezzo", "Soprano"]);

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
  const studentId = typeof b.studentId === "string" ? b.studentId : "";
  const range = typeof b.range === "string" ? b.range : "";
  const lowHz = Number(b.lowHz);
  const highHz = Number(b.highHz);

  if (!group || !getStudentTestStudent(group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  if (!canAccessStudentTest(session.user?.role, session.user?.email, group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const key = `${studentTestBasePrefix(group as StudentTestGroup)}/ranges/${studentId}.json`;

  if (!range) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return NextResponse.json({ ok: true });
  }

  if (!ALLOWED_RANGES.has(range) || !Number.isFinite(lowHz) || !Number.isFinite(highHz)) {
    return NextResponse.json({ error: "Invalid vocal range result" }, { status: 400 });
  }

  await uploadBuffer(
    key,
    Buffer.from(
      JSON.stringify({
        range,
        lowHz,
        highHz,
        detectedAt: new Date().toISOString(),
        detectedBy: session.user?.email ?? null,
      })
    ),
    "application/json"
  );

  return NextResponse.json({ ok: true });
}
