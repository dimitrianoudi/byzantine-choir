import { redirect } from "next/navigation";
import PublicationManager from "@/components/ekdoseis/admin/PublicationManager";
import { getSession } from "@/lib/session";
import { readPublicationManifestFresh } from "@/lib/publications/repository";

export const dynamic = "force-dynamic";

export default async function PublicationAdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.user?.role !== "admin") redirect("/");

  const stored = await readPublicationManifestFresh();
  return (
    <PublicationManager
      initialManifest={stored.manifest}
      initialSource={stored.source}
    />
  );
}
