'use client'

import { useState } from "react"

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<"podcast"|"pdf">("podcast")
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setBusy(true); setStatus("Μεταφόρτωση...")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    const res = await fetch("/api/files/upload", { method: "POST", body: fd })
    if (res.ok) {
      setStatus("ΟΚ · ανέβηκε επιτυχώς!")
      setFile(null)
    } else {
      const t = await res.text()
      setStatus("Σφάλμα: " + t)
    }
    setBusy(false)
  }

  return (
    <div className="max-w-lg mx-auto card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Ανέβασμα Αρχείων</h2>
      <p className="text-sm text-white/70">Επιλέξτε podcast (.mp3/.m4a) ή PDF.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-2"><input type="radio" name="type" value="podcast" checked={type==="podcast"} onChange={()=>setType("podcast")} /> Podcast</label>
          <label className="flex items-center gap-2"><input type="radio" name="type" value="pdf" checked={type==="pdf"} onChange={()=>setType("pdf")} /> PDF</label>
        </div>
        <input className="input" type="file" accept={type==="pdf" ? "application/pdf" : "audio/mpeg,audio/mp4"} onChange={e=>setFile(e.target.files?.[0] || null)} />
        <button className="btn" disabled={!file || busy} type="submit">{busy ? "Ανέβασμα..." : "Ανέβασμα"}</button>
      </form>
      {status && <div className="text-sm">{status}</div>}
      <a className="btn" href="/">Επιστροφή στα αρχεία</a>
    </div>
  )
}