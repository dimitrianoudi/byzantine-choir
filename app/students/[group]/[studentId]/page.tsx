import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StudentTestsClient from "@/components/StudentTestsClient";
import { getSession } from "@/lib/session";
import {
  canAccessStudentTest,
  getStudentTestGroup,
  getStudentTestStudent,
  isStudentTestGroup,
  isStudentTestsAdmin,
  type StudentTestGroup,
} from "@/lib/studentTests";

export const dynamic = "force-dynamic";

export default async function PrivateStudentTestPage({
  params,
}: {
  params: Promise<{ group: string; studentId: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { group: rawGroup, studentId } = await params;
  if (!isStudentTestGroup(rawGroup)) notFound();

  const group = rawGroup as StudentTestGroup;
  const student = getStudentTestStudent(group, studentId);
  if (!student) notFound();

  const role = session.user?.role ?? "member";
  if (!canAccessStudentTest(role, session.user?.email, group, studentId)) {
    redirect("/students");
  }

  const config = getStudentTestGroup(group);
  const isAdmin = isStudentTestsAdmin(role, session.user?.email);

  return (
    <main className="container section space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 24 }}>
              Προσωπική Αξιολόγηση
            </h1>
            <p className="text-sm text-muted mt-1">
              {student.name} · {config.courseLabel}
            </p>
          </div>
          {isAdmin && (
            <Link href={`/students/${group}`} className="btn btn-outline">
              Όλο το τμήμα
            </Link>
          )}
        </div>
      </header>

      <StudentTestsClient
        group={group}
        groupLabel={config.courseLabel}
        initialStudents={[{ id: student.id, name: student.name }]}
        role={isAdmin ? "admin" : "member"}
        studentId={student.id}
      />
    </main>
  );
}
