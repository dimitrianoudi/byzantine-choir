import Gallery from "@/components/Gallery";
import { getSession } from "@/lib/session";

export default async function GalleryPageContent({
  prefix = "",
}: {
  prefix?: string;
}) {
  const session = await getSession();
  const role = session.user?.role || "member";

  return (
    <main className="container section">
      <Gallery role={role} prefix={prefix} />
    </main>
  );
}
