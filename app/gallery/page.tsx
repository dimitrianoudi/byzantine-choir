import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Gallery from "@/components/Gallery";

export default async function GalleryPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <main className="container section">
      <Gallery />
    </main>
  );
}
