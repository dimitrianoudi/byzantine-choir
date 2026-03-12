import Link from "next/link";
import Library from "@/components/Library";
import { buildMaterialUrlForPrefix } from "@/lib/materialNavigation";
import type { Role } from "@/lib/session";

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

export default function MaterialPageContent({
  role,
  prefix,
  query = "",
}: {
  role: Role;
  prefix: string;
  query?: string;
}) {
  const year = new Date().getFullYear();
  const akPrefix = `Ακολουθίες/${year}/`;
  const ak = parseAkolouthies(prefix);
  const isAkolouthies = prefix.startsWith("Ακολουθίες/");
  const searchAction = isAkolouthies ? buildMaterialUrlForPrefix(prefix) : "/material";
  const clearSearchHref = buildMaterialUrlForPrefix(prefix);
  const searchQuery = query.trim();

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

        <div className="actions">
          <form action={searchAction} className="flex flex-wrap items-center gap-2">
            {!isAkolouthies && !!prefix && <input type="hidden" name="prefix" value={prefix} />}
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              className="input"
              placeholder="Αναζήτηση σε όλα τα PDF"
              aria-label="Αναζήτηση PDF"
              style={{ maxWidth: 280 }}
            />
            <button type="submit" className="btn btn-outline">
              Αναζήτηση PDF
            </button>
            {searchQuery && (
              <Link href={clearSearchHref} className="btn btn-outline">
                Καθαρισμός
              </Link>
            )}
          </form>

          <Link href="/material" className="btn btn-outline">
            Όλα
          </Link>

          <Link
            href={buildMaterialUrlForPrefix(akPrefix)}
            className="btn btn-gold"
            title="Μετάβαση στον φάκελο Ακολουθίες του τρέχοντος έτους"
          >
            Ακολουθίες {year}
          </Link>

          {role === "admin" && (
            <Link href={uploadHref} className="btn btn-outline">
              Ανέβασμα
            </Link>
          )}
        </div>
      </header>

      <section className="space-y-4">
        <Library role={role} prefix={prefix} query={searchQuery} />
      </section>
    </div>
  );
}
