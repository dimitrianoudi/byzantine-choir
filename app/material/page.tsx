import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Library from "@/components/Library";

export default async function MaterialPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="space-y-6">
      <header className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Υλικό
        </h1>
        <div className="header-spacer" />
      </header>

      <section className="space-y-4">
        <Library role={session.user?.role || "member"} />
      </section>
    </div>
  );
}
