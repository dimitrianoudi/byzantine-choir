'use client';

import { useState, useMemo } from 'react';

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'podcast' | 'pdf'>('podcast');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = useMemo(
    () => (type === 'pdf' ? 'application/pdf' : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a'),
    [type]
  );

  const handleFile = (f: File | undefined) => {
    if (!f) return setFile(null);
    // quick whitelist check
    if (type === 'pdf' && f.type !== 'application/pdf') {
      setStatus('Το αρχείο δεν είναι PDF.');
      return;
    }
    if (
      type === 'podcast' &&
      !['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'].includes(f.type)
    ) {
      setStatus('Μη υποστηριζόμενο αρχείο ήχου.');
      return;
    }
    setStatus(null);
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const MAX = 200 * 1024 * 1024; // 200MB
    if (file.size > MAX) {
      setStatus('Το αρχείο είναι πολύ μεγάλο (όριο 200MB).');
      return;
    }

    setBusy(true);
    setStatus('Δημιουργία συνδέσμου μεταφόρτωσης…');
    try {
      const presignRes = await fetch('/api/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mime: file.type }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { url, key } = await presignRes.json();

      setStatus('Μεταφόρτωση στο Storage…');
      const put = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Αποτυχία μεταφόρτωσης (${put.status})`);

      setStatus('✅ Ανέβηκε επιτυχώς!');
      setFile(null);
    } catch (err: any) {
      setStatus('Σφάλμα: ' + (err?.message || 'Κάτι πήγε στραβά'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container space-y-6">
      <h3 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22, fontFamily: 'inherit' }}>
        Ανέβασμα Αρχείων
      </h3>

      <div className="card p-6 space-y-5">
        {/* Type selector */}
        <fieldset className="space-y-2">
          <legend className="text-muted text-sm">Επιλέξτε τύπο</legend>
          <div className="actions">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="podcast"
                checked={type === 'podcast'}
                onChange={() => setType('podcast')}
                style={{ accentColor: 'var(--blue-600)' }}
              />
              Podcast (MP3/M4A)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="pdf"
                checked={type === 'pdf'}
                onChange={() => setType('pdf')}
                style={{ accentColor: 'var(--blue-600)' }}
              />
              PDF
            </label>
          </div>
        </fieldset>

        {/* File picker */}
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-muted">Αρχείο</label>
            <input
              className="input"
              type="file"
              accept={accept}
              onChange={(e) => handleFile(e.target.files?.[0] as File | undefined)}
            />
            {file && (
              <div className="text-sm text-muted">
                Επιλεγμένο: <span className="text-blue">{file.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-gold" disabled={!file || busy} type="submit">
              {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
            </button>
            <a className="btn btn-outline" href="/">
              Επιστροφή στα αρχεία
            </a>
          </div>

          {/* Status */}
          {status && (
            <div
              className="card p-3"
              style={{ borderColor: 'var(--border)', background: '#fff' }}
            >
              <span className="text-sm">{status}</span>
            </div>
          )}
        </form>
      </div>

      {/* Tips */}
      <div className="text-sm text-muted">
        Υποστηριζόμενα: MP3/M4A για podcasts και PDF για βιβλία. Μέγιστο μέγεθος 200MB.
      </div>
    </div>
  );
}
