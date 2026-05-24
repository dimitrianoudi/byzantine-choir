import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getStudentTestAccessForEmail,
  getStudentTestGroup,
  isStudentTestsAdmin,
  type StudentTestGroup,
} from "@/lib/studentTests";

const GROUP_ORDER: StudentTestGroup[] = ["kids", "women", "men"];
export const dynamic = "force-dynamic";

export default async function StudentTestsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const role = session.user?.role ?? "member";
  const isAdmin = isStudentTestsAdmin(role, session.user?.email);
  const access = getStudentTestAccessForEmail(session.user?.email);

  if (!isAdmin && access.length === 1) {
    redirect(`/students/${access[0].group}/${access[0].student.id}`);
  }

  return (
    <main className="container section space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 24 }}>
          Αξιολόγηση Μαθητών
        </h1>
        {isAdmin ? (
          <p className="text-sm text-muted max-w-2xl">
            Επιλέξτε τμήμα για να δείτε την παρτιτούρα, τις ηχογραφήσεις των μαθητών,
            την φωνητική αξιολόγηση του δασκάλου και την ολοκλήρωση της αξιολόγησης.
          </p>
        ) : (
          <p className="text-sm text-muted max-w-2xl">
            Επιλέξτε την προσωπική σας αξιολόγηση.
          </p>
        )}
      </header>

      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-3">
          {GROUP_ORDER.map((group) => {
            const config = getStudentTestGroup(group);
            return (
              <Link key={group} href={`/students/${group}`} className="card p-5 no-underline space-y-3">
                <div className="font-heading text-lg text-blue">{config.courseLabel}</div>
                <div className="text-sm text-muted">{config.students.length} μαθητές</div>
                <div className="btn btn-outline btn-sm inline-flex">Άνοιγμα</div>
              </Link>
            );
          })}
        </div>
      ) : access.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {access.map(({ group, student }) => {
            const config = getStudentTestGroup(group);
            return (
              <Link key={`${group}-${student.id}`} href={`/students/${group}/${student.id}`} className="card p-5 no-underline space-y-3">
                <div className="font-heading text-lg text-blue">{student.name}</div>
                <div className="text-sm text-muted">{config.courseLabel}</div>
                <div className="btn btn-outline btn-sm inline-flex">Άνοιγμα</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card p-6 text-muted">
          Δεν βρέθηκε προσωπική αξιολόγηση συνδεδεμένη με το email σας.
        </div>
      )}
    </main>
  );
}
