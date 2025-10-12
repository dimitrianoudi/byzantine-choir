import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { presignGet } from "@/lib/s3"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { key } = await req.json()
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 })
  const url = await presignGet(key, 60 * 60) // 1h
  return NextResponse.json({ url })
}