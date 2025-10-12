import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function POST(req: Request) {
  const { code } = await req.json().catch(()=>({}))
  const member = process.env.SHARED_CODE
  const admin = process.env.ADMIN_CODE
  if (!code) return NextResponse.json({ error: "Απαιτείται κωδικός" }, { status: 400 })
  const session = await getSession()

  if (admin && code === admin) {
    session.user = { role: "admin" }
  } else if (member && code === member) {
    session.user = { role: "member" }
  } else {
    return NextResponse.json({ error: "Μη έγκυρος κωδικός" }, { status: 401 })
  }
  await session.save()
  return NextResponse.json({ ok: true })
}