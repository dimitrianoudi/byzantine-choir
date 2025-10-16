// app/material/page.tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Library from "@/components/Library";

export default async function MaterialPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  return (
    <main className="container section">
      <Library role={session.user?.role || "member"} />
    </main>
  );
}
