import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Uploader from "@/components/Uploader";

export default async function UploadPage({
  searchParams,
}: {
  searchParams?: { series?: string; prefix?: string; year?: string; date?: string };
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.user?.role !== "admin") redirect("/");

  return <Uploader initial={searchParams} />;
}
