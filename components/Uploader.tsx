'use client';
import { useState } from "react";

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"podcast"|"pdf">("podcast");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Optional: client-side limits/whitelist
    const MAX = 200 * 1024 * 1024; // 200MB, adjust
    if (file.size > MAX) { setStatus("File too large"); return; }
    const isPdf = type === "pdf";
    const okType = isPdf ? file.type === "application/pdf" :
      ["audio/mpeg","audio/mp4","audio/aac","audio/x-m4a"].includes(file.type);
    if (!okType) { setStatus("Unsupported file type"); return; }

    setBusy(true); setStatus("Requesting upload URL...");
    try {
      const presignRes = await fetch("/api/files/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type: file.type }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { url, key } = await presignRes.json();

      setStatus("Uploading to storage...");
      const put = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

      setStatus("OK · ανέβηκε επιτυχώς!");
      setFile(null);
      // Optionally trigger a reload of the list
      // location.href = "/";
    } catch (err: any) {
      setStatus("Σφάλμα: " + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Ανέβασμα Αρχείων</h2>
      <p className="text-sm text-white/70">Επιλέξτε podcast (.mp3/.m4a) ή PDF.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="podcast" checked={type==="podcast"} onChange={()=>setType("podcast")} /> Podcast
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="pdf" checked={type==="pdf"} onChange={()=>setType("pdf")} /> PDF
          </label>
        </div>
        <input
          className="input"
          type="file"
          accept={type==="pdf" ? "application/pdf" : "audio/mpeg,audio/mp4,audio/aac,audio/x-m4a"}
          onChange={e=>setFile(e.target.files?.[0] || null)}
        />
        <button className="btn" disabled={!file || busy} type="submit">
          {busy ? "Ανέβασμα..." : "Ανέβασμα"}
        </button>
      </form>
      {status && <div className="text-sm">{status}</div>}
      <a className="btn" href="/">Επιστροφή στα αρχεία</a>
    </div>
  );
}
