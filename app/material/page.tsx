import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import MaterialPageContent from "@/app/material/MaterialPageContent";
import { buildMaterialUrlForPrefix } from "@/lib/materialNavigation";

type SearchParams = { prefix?: string; q?: string };

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { prefix = "", q = "" } = await searchParams;
  if (!q && (prefix.startsWith("Ακολουθίες/") || prefix === "Ακολουθίες")) {
    redirect(buildMaterialUrlForPrefix(prefix));
  }

  return <MaterialPageContent role={session.user?.role || "member"} prefix={prefix} query={q} />;
}
