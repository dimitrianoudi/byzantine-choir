import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MaterialPageContent from "@/app/material/MaterialPageContent";
import { buildAkolouthiesPrefixFromParts } from "@/lib/materialNavigation";

export default async function MaterialAkolouthiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ parts?: string[] }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { parts } = await params;
  const { q = "" } = (await searchParams) || {};
  const prefix = buildAkolouthiesPrefixFromParts(parts);

  return <MaterialPageContent role={session.user?.role || "member"} prefix={prefix} query={q} />;
}
