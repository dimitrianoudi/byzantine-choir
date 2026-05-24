export const runtime = "nodejs";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { BUCKET, s3, uploadBuffer } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  getStudentTestStudent,
  isStudentTestGroup,
  isStudentTestsAdmin,
  studentTestBasePrefix,
  type StudentTestGroup,
} from "@/lib/studentTests";

const MAX_NOTE_LENGTH = 4000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isStudentTestsAdmin(session.user?.role, session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
  const text = typeof b.text === "string" ? b.text.trim() : "";

  if (!group || !getStudentTestStudent(group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  if (text.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: "Το σημείωμα είναι πολύ μεγάλο." }, { status: 400 });
  }

  const key = `${studentTestBasePrefix(group as StudentTestGroup)}/notes/${studentId}.json`;

  if (!text) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return NextResponse.json({ ok: true, teacherNote: null });
  }

  const teacherNote = {
    text,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user?.email ?? null,
  };

  await uploadBuffer(
    key,
    Buffer.from(JSON.stringify(teacherNote)),
    "application/json"
  );

  return NextResponse.json({ ok: true, teacherNote });
}
