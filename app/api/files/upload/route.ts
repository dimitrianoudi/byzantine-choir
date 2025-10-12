import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { uploadBuffer } from "@/lib/s3"

export const runtime = "nodejs" // ensure Node runtime for Buffer

export async function POST(req: Request) {
  const session = await getSession()
  if (session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  const type = (form.get("type") as string) || "podcast"
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })
  if (type !== "podcast" && type !== "pdf") return NextResponse.json({ error: "bad type" }, { status: 400 })

  const arrayBuf = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuf)
  const safeName = file.name.replace(/[^\w\d\-_.]+/g, "_")
  const key = `${type === "podcast" ? "podcasts" : "pdfs"}/${Date.now()}-${safeName}`
  await uploadBuffer(key, buf, file.type || (type === "pdf" ? "application/pdf" : "audio/mpeg"))
  return NextResponse.json({ ok: true, key })
}