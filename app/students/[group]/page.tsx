import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StudentTestsClient from "@/components/StudentTestsClient";
import { getSession } from "@/lib/session";
import {
  getStudentTestGroup,
  isStudentTestGroup,
  type StudentTestGroup,
} from "@/lib/studentTests";

export default async function StudentTestGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { group: rawGroup } = await params;
  if (!isStudentTestGroup(rawGroup)) notFound();

  const group = rawGroup as StudentTestGroup;
  const config = getStudentTestGroup(group);

  return (
    <main className="container section space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 24 }}>
              Αξιολόγηση Μαθητών
            </h1>
            <p className="text-sm text-muted mt-1">{config.courseLabel}</p>
          </div>
          <Link href="/students" className="btn btn-outline">
            Όλα τα τμήματα
          </Link>
        </div>
      </header>

      <StudentTestsClient
        group={group}
        groupLabel={config.courseLabel}
        initialStudents={config.students}
        role={session.user?.role ?? "member"}
      />
    </main>
  );
}
