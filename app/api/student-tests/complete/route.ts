export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3, uploadBuffer } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  getStudentTestStudent,
  isStudentTestGroup,
  studentTestBasePrefix,
  type StudentTestGroup,
} from "@/lib/studentTests";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") {
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
  const completed = b.completed === true;

  if (!group || !getStudentTestStudent(group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  const key = `${studentTestBasePrefix(group as StudentTestGroup)}/completed/${studentId}.json`;

  if (completed) {
    await uploadBuffer(
      key,
      Buffer.from(
        JSON.stringify({
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: session.user?.email ?? null,
        })
      ),
      "application/json"
    );
  } else {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }

  return NextResponse.json({ ok: true });
}
