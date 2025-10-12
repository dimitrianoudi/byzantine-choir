import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import Library from "@/components/Library"

export default async function HomePage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect("/login")
  return <Library role={session.user?.role || "member"} />
}