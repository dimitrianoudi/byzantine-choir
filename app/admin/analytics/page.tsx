import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getLoginAnalytics } from "@/lib/loginAudit";
import { getActivityAnalytics, type ActivityRoleFilter } from "@/lib/activityAudit";
import Link from "next/link";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("el-GR");
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ audience?: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== "admin") redirect("/");

  const sp = (await searchParams) || {};
  const audience: ActivityRoleFilter =
    sp.audience === "admin" ? "admin" : sp.audience === "all" ? "all" : "member";

  const analytics = await getLoginAnalytics(30);
  const activity = await getActivityAnalytics(30, audience);

  return (
    <div className="space-y-6">
      <header className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Στατιστικά Συνδέσεων
        </h1>
      </header>

      <div className="card p-4">
        <div className="text-xs text-muted">Συνδεδεμένος ως</div>
        <div className="text-sm font-medium mt-1 break-all">{session.user?.email || "—"}</div>
      </div>

      <div className="card p-3">
        <div className="text-xs text-muted mb-2">Προβολή activity για</div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/analytics?audience=member" className={audience === "member" ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm"}>
            Μέλη
          </Link>
          <Link href="/admin/analytics?audience=admin" className={audience === "admin" ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm"}>
            Διαχειριστές
          </Link>
          <Link href="/admin/analytics?audience=all" className={audience === "all" ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm"}>
            Όλοι
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Επιτυχείς συνδέσεις ({analytics.rangeDays} ημέρες)</div>
          <div className="text-2xl font-semibold mt-1">{analytics.totals.success}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Αποτυχημένες προσπάθειες</div>
          <div className="text-2xl font-semibold mt-1">{analytics.totals.failure}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Μοναδικά μέλη</div>
          <div className="text-2xl font-semibold mt-1">{analytics.totals.uniqueMembers}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Μοναδικοί διαχειριστές</div>
          <div className="text-2xl font-semibold mt-1">{analytics.totals.uniqueAdmins}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-muted">
            Συνεδρίες ({audience === "member" ? "μέλη" : audience === "admin" ? "διαχειριστές" : "όλοι"}) ({activity.rangeDays} ημέρες)
          </div>
          <div className="text-2xl font-semibold mt-1">{activity.totals.sessions}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Προβολές σελίδων</div>
          <div className="text-2xl font-semibold mt-1">{activity.totals.pageViews}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Μέσος χρόνος παραμονής (λεπτά)</div>
          <div className="text-2xl font-semibold mt-1">{activity.totals.avgSessionMinutes}</div>
        </div>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Στατιστικά ανά μέλος (email)</h2>
        {analytics.memberStats.length === 0 && <div className="text-sm text-muted">Δεν υπάρχουν δεδομένα.</div>}
        {analytics.memberStats.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Επιτυχείς</th>
                  <th className="py-2 pr-4">Αποτυχημένες</th>
                  <th className="py-2 pr-4">Τελευταία επιτυχής</th>
                  <th className="py-2">Τελευταία προσπάθεια</th>
                </tr>
              </thead>
              <tbody>
                {analytics.memberStats.map((m) => (
                  <tr key={m.email} className="border-t border-subtle">
                    <td className="py-2 pr-4 break-all">{m.email}</td>
                    <td className="py-2 pr-4">{m.successCount}</td>
                    <td className="py-2 pr-4">{m.failureCount}</td>
                    <td className="py-2 pr-4">{m.lastSuccessAt ? fmtDate(m.lastSuccessAt) : "—"}</td>
                    <td className="py-2">{fmtDate(m.lastAttemptAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Πρόσφατες προσπάθειες</h2>
        {analytics.recent.length === 0 && <div className="text-sm text-muted">Δεν υπάρχουν δεδομένα.</div>}
        {analytics.recent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-4">Ημ/νία</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Ρόλος</th>
                  <th className="py-2">Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent.map((r, idx) => (
                  <tr key={`${r.at}-${r.email}-${idx}`} className="border-t border-subtle">
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.at)}</td>
                    <td className="py-2 pr-4 break-all">{r.email}</td>
                    <td className="py-2 pr-4">{r.role}</td>
                    <td className="py-2">{r.status === "success" ? "Επιτυχία" : "Αποτυχία"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
