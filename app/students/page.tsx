import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { STUDENT_TEST_GROUPS, type StudentTestGroup } from "@/lib/studentTests";

const GROUP_ORDER: StudentTestGroup[] = ["kids", "women", "men"];

export default async function StudentTestsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <main className="container section space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 24 }}>
          Αξιολόγηση Μαθητών
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          Επιλέξτε τμήμα για να δείτε την παρτιτούρα, τις ηχογραφήσεις των μαθητών,
          την φωνητική αξιολόγηση του δασκάλου και την ολοκλήρωση της αξιολόγησης.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {GROUP_ORDER.map((group) => {
          const config = STUDENT_TEST_GROUPS[group];
          return (
            <Link key={group} href={`/students/${group}`} className="card p-5 no-underline space-y-3">
              <div className="font-heading text-lg text-blue">{config.courseLabel}</div>
              <div className="text-sm text-muted">{config.students.length} μαθητές</div>
              <div className="btn btn-outline btn-sm inline-flex">Άνοιγμα</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
