'use client';

import { useMemo, useState } from 'react';

type CourseKey = 'kids' | 'women' | 'men';
type SectionKey = 'lessons' | 'akolouthies';

const COURSES: { key: CourseKey; label: string }[] = [
  { key: 'kids', label: 'Ψαλτική παιδικής φωνής' },
  { key: 'women', label: 'Ψαλτική γυναικείας φωνής' },
  { key: 'men', label: 'Ψαλτική ανδρικής φωνής' },
];

const YEARS = [2025, 2026];
const LESSONS = Array.from({ length: 30 }, (_, i) => i + 1);

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export default function Uploader() {
  const [section, setSection] = useState<SectionKey>('lessons');

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'podcast' | 'pdf'>('podcast');

  const [course, setCourse] = useState<CourseKey>('kids');
  const [year, setYear] = useState<number>(2025);
  const [lesson, setLesson] = useState<number>(1);

  const [akYear, setAkYear] = useState<number>(new Date().getFullYear());
  const [akDate, setAkDate] = useState<string>(yyyyMmDd(new Date()));

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = useMemo(() => {
    if (section === 'akolouthies') return 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a';
    return type === 'pdf' ? 'application/pdf' : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a';
  }, [section, type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!file) {
      setStatus('Επιλέξτε ένα αρχείο.');
      return;
    }

    const MAX = 200 * 1024 * 1024;
    if (file.size > MAX) {
      setStatus('Το αρχείο είναι πολύ μεγάλο.');
      return;
    }

    if (section === 'akolouthies') {
      const okAudio = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'].includes(file.type);
      if (!okAudio) {
        setStatus('Για Ακολουθίες ανεβάζουμε μόνο ήχο (mp3/m4a/aac).');
        return;
      }
    } else {
      const isPdf = type === 'pdf';
      const okType = isPdf
        ? file.type === 'application/pdf'
        : ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'].includes(file.type);

      if (!okType) {
        setStatus('Μη υποστηριζόμενος τύπος αρχείου.');
        return;
      }
    }

    setBusy(true);
    setStatus('Ζητάω URL ανεβάσματος…');

    try {
      const body =
        section === 'akolouthies'
          ? {
              filename: file.name,
              mime: file.type,
              section: 'akolouthies',
              year: akYear,
              date: akDate,
            }
          : {
              filename: file.name,
              mime: file.type,
              section: 'lessons',
              kind: type,
              course,
              year,
              lesson,
            };

      const presignRes = await fetch('/api/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(errJson?.error || `Presign failed (${presignRes.status})`);
      }

      const { url, key } = await presignRes.json();
      if (!url || !key) throw new Error('Άκυρη απάντηση από το presign.');

      setStatus('Ανεβάζω στο storage…');

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      setStatus(`OK · ανέβηκε στο: ${key}`);
      setFile(null);
      window.location.href = '/material';
    } catch (err: any) {
      setStatus('Σφάλμα: ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto card p-6 space-y-6">
      <h1 className="font-heading text-xl font-semibold mb-2">Ανέβασμα</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm text-muted">Τμήμα</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="section"
                value="lessons"
                checked={section === 'lessons'}
                onChange={() => setSection('lessons')}
              />
              <span>Μαθήματα</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="section"
                value="akolouthies"
                checked={section === 'akolouthies'}
                onChange={() => setSection('akolouthies')}
              />
              <span>Ακολουθίες</span>
            </label>
          </div>
        </div>

        {section === 'lessons' && (
          <>
            <div>
              <label className="text-sm text-muted">Είδος αρχείου</label>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value="podcast"
                    checked={type === 'podcast'}
                    onChange={() => setType('podcast')}
                  />
                  <span>Podcast (ήχος)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value="pdf"
                    checked={type === 'pdf'}
                    onChange={() => setType('pdf')}
                  />
                  <span>PDF (σημειώσεις)</span>
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted">Κατηγορία</label>
                <select
                  className="input mt-1"
                  value={course}
                  onChange={(e) => setCourse(e.target.value as CourseKey)}
                >
                  {COURSES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted">Έτος</label>
                <select
                  className="input mt-1"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted">Μάθημα #</label>
                <select
                  className="input mt-1"
                  value={lesson}
                  onChange={(e) => setLesson(Number(e.target.value))}
                >
                  {LESSONS.map((n) => (
                    <option key={n} value={n}>
                      {n.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {section === 'akolouthies' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Έτος</label>
              <select
                className="input mt-1"
                value={akYear}
                onChange={(e) => setAkYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Ημερομηνία (Κυριακή)</label>
              <input
                className="input mt-1"
                type="date"
                value={akDate}
                onChange={(e) => setAkDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-muted">Αρχείο</label>
          <input
            className="input mt-1"
            type="file"
            accept={accept}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <a href="/material" className="btn btn-outline">
            Πίσω στο Υλικό
          </a>
          <button className="btn btn-gold" type="submit" disabled={!file || busy}>
            {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
          </button>
        </div>
      </form>

      {status && (
        <div className="text-sm text-muted border-t border-subtle pt-3">{status}</div>
      )}
    </div>
  );
}
