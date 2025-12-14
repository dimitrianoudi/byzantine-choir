import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Uploader from "@/components/Uploader";

type SearchParams = {
  series?: string;
  prefix?: string;
  year?: string;
  date?: string;
};

export default async function UploadPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.user?.role !== "admin") redirect("/");

  const sp = (await searchParams) ?? {};

  return <Uploader initialSearchParams={sp} />;
}
