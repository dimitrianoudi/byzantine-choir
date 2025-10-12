'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
    if (res.ok) {
      router.push("/")
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error || "Λάθος κωδικός")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-16 card p-6">
      <h2 className="text-xl font-semibold mb-4">Είσοδος Μελών</h2>
      <p className="text-white/70 text-sm mb-4">Πληκτρολογήστε τον κωδικό πρόσβασης που χρησιμοποιεί η χορωδία.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label>Κωδικός</label>
          <input className="input mt-1" type="password" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="π.χ. ISOKRATIMA2025" required />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button className="btn" disabled={loading} type="submit">{loading ? "Σύνδεση..." : "Σύνδεση"}</button>
      </form>
      <p className="text-xs text-white/50 mt-4">Σημ: Ο δάσκαλος έχει ξεχωριστό κωδικό διαχειριστή.</p>
    </div>
  )
}