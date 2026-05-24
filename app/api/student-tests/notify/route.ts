export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getSession } from "@/lib/session";
import {
  canAccessStudentTest,
  getStudentTestGroup,
  getStudentTestStudent,
  isStudentTestGroup,
  type StudentTestGroup,
} from "@/lib/studentTests";

const TEACHER_NOTIFICATION_EMAIL = "stathisnikolaos@gmail.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  const studentId = typeof b.studentId === "string" ? b.studentId : "";
  const uploadKey = typeof b.key === "string" ? b.key : "";

  if (!group || !getStudentTestStudent(group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  if (!canAccessStudentTest(session.user?.role, session.user?.email, group as StudentTestGroup, studentId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const student = getStudentTestStudent(group as StudentTestGroup, studentId);
  const config = getStudentTestGroup(group as StudentTestGroup);
  const origin = new URL(req.url).origin;
  const reviewUrl = `${origin}/students/${group}/${studentId}`;
  const studentName = student?.name ?? studentId;

  const subject = `Νέα ηχογράφηση μαθητή: ${studentName}`;
  const text = [
    `Ο/Η μαθητής/τρια ${studentName} ανέβασε νέα ηχογράφηση για αξιολόγηση.`,
    `Τμήμα: ${config.courseLabel}`,
    `Email μαθητή: ${session.user?.email ?? "-"}`,
    uploadKey ? `Αρχείο: ${uploadKey}` : "",
    "",
    `Άνοιγμα αξιολόγησης: ${reviewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Νέα ηχογράφηση μαθητή</h2>
      <p>Ο/Η μαθητής/τρια <strong>${escapeHtml(studentName)}</strong> ανέβασε νέα ηχογράφηση για αξιολόγηση.</p>
      <p><strong>Τμήμα:</strong> ${escapeHtml(config.courseLabel)}</p>
      <p><strong>Email μαθητή:</strong> ${escapeHtml(session.user?.email ?? "-")}</p>
      ${uploadKey ? `<p><strong>Αρχείο:</strong> ${escapeHtml(uploadKey)}</p>` : ""}
      <p><a href="${escapeHtml(reviewUrl)}">Άνοιγμα αξιολόγησης</a></p>
    </div>
  `;

  const result = await sendEmail({
    to: TEACHER_NOTIFICATION_EMAIL,
    subject,
    text,
    html,
  });

  if (!result.ok) {
    console.warn("STUDENT_RECORDING_NOTIFICATION_FAILED", result.reason);
  }

  return NextResponse.json({ ok: true, notification: result });
}
