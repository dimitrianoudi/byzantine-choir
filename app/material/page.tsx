import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Library from "@/components/Library";

type SearchParams = { prefix?: string };

function parseAkolouthies(prefix: string) {
  const parts = (prefix || "").split("/").filter(Boolean);
  if (parts[0] !== "Ακολουθίες") return null;

  const year = parts[1] ? Number(parts[1]) : NaN;
  const date = parts[2] || "";

  const isoDateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
  return {
    year: Number.isFinite(year) ? String(year) : "",
    date: isoDateOk ? date : "",
  };
}

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { prefix = "" } = await searchParams;

  const year = new Date().getFullYear();
  const akPrefix = `Ακολουθίες/${year}/`;

  const ak = parseAkolouthies(prefix);

  const uploadHref =
    ak && (ak.year || ak.date)
      ? `/upload?series=akolouthies${ak.year ? `&year=${encodeURIComponent(ak.year)}` : ""}${
          ak.date ? `&date=${encodeURIComponent(ak.date)}` : ""
        }`
      : "/upload";

  return (
    <div className="space-y-6">
      <header className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Υλικό
        </h1>
        <div className="header-spacer" />
        <nav className="actions">
          <Link href="/material" className="btn btn-outline">
            Όλα
          </Link>

          <Link
            href={`/material?prefix=${encodeURIComponent(akPrefix)}`}
            className="btn btn-gold"
            title="Μετάβαση στον φάκελο Ακολουθίες του τρέχοντος έτους"
          >
            Ακολουθίες {year}
          </Link>

          {session.user?.role === "admin" && (
            <Link href={uploadHref} className="btn btn-outline">
              Ανέβασμα
            </Link>
          )}
        </nav>
      </header>

      <section className="space-y-4">
        <Library role={session.user?.role || "member"} prefix={prefix} />
      </section>
    </div>
  );
}
