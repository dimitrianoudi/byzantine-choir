import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MaterialPageContent from "@/app/material/MaterialPageContent";
import { buildAkolouthiesPrefixFromParts } from "@/lib/materialNavigation";

export default async function MaterialAkolouthiesPage({
  params,
}: {
  params: Promise<{ parts?: string[] }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { parts } = await params;
  const prefix = buildAkolouthiesPrefixFromParts(parts);

  return <MaterialPageContent role={session.user?.role || "member"} prefix={prefix} />;
}
