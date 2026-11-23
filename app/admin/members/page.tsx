import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MemberManager from "@/components/admin/MemberManager";
import { splitEmailList } from "@/lib/members/access";
import { readManagedMemberManifestFresh } from "@/lib/members/repository";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Διαχείριση Μελών",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MemberAdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.user?.role !== "admin") redirect("/");

  const stored = await readManagedMemberManifestFresh();
  const adminEmails = new Set(
    splitEmailList(process.env.ADMIN_GOOGLE_EMAILS),
  );
  const configuredMemberEmails = splitEmailList(
    process.env.ALLOWED_GOOGLE_EMAILS,
  ).filter((email) => !adminEmails.has(email));

  return (
    <MemberManager
      initialManifest={stored.manifest}
      configuredMemberEmails={configuredMemberEmails}
    />
  );
}
