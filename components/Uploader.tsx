'use client';

import { useMemo, useState } from 'react';

type CourseKey = 'kids' | 'women' | 'men';
type Dest = 'lessons' | 'akolouthies';
type Kind = 'podcast' | 'pdf';
type InitialSearchParams = {
  series?: string;
  prefix?: string;
  year?: string;
  date?: string;
};

const COURSES: { key: CourseKey; label: string }[] = [
  { key: 'kids', label: 'Ψαλτική παιδικής φωνής' },
  { key: 'women', label: 'Ψαλτική γυναικείας φωνής' },
  { key: 'men', label: 'Ψαλτική ανδρικής φωνής' },
];

const YEARS = [2025, 2026];
const LESSONS = Array.from({ length: 30 }, (_, i) => i + 1);

type UploadFile = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  key?: string;
};

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fileKindFromMime(mime: string): Kind | null {
  if (mime === 'application/pdf') return 'pdf';
  if (
    mime.startsWith('audio/') ||
    ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'].includes(mime)
  )
    return 'podcast';
  return null;
}

function parseInitialDest(initialSearchParams?: InitialSearchParams): Dest {
  return initialSearchParams?.series === 'akolouthies' ? 'akolouthies' : 'lessons';
}

function parseInitialAkYear(initialSearchParams?: InitialSearchParams): number {
  const year = Number(initialSearchParams?.year);
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

function parseInitialAkDate(initialSearchParams?: InitialSearchParams): string {
  const date = initialSearchParams?.date;
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoToday();
}

export default function Uploader({ initialSearchParams }: { initialSearchParams?: InitialSearchParams }) {
  const [dest, setDest] = useState<Dest>(() => parseInitialDest(initialSearchParams));
  const [kind, setKind] = useState<Kind>('podcast');

  const [course, setCourse] = useState<CourseKey>('kids');
  const [year, setYear] = useState<number>(2025);
  const [lesson, setLesson] = useState<number>(1);

  const [akYear, setAkYear] = useState<number>(() => parseInitialAkYear(initialSearchParams));
  const [akDate, setAkDate] = useState<string>(() => parseInitialAkDate(initialSearchParams));

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = useMemo(() => {
    if (dest === 'akolouthies') return 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a';
    return kind === 'pdf'
      ? 'application/pdf'
      : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a';
  }, [dest, kind]);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: UploadFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const id = `${Date.now()}-${i}-${f.name}`;
      next.push({ id, file: f, progress: 0, status: 'pending' });
    }
    setFiles((prev) => [...prev, ...next]);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const clearList = () => {
    setFiles([]);
    setStatus(null);
  };

  const validate = () => {
    if (files.length === 0) return 'Επιλέξτε ένα ή περισσότερα αρχεία.';

    const MAX = 200 * 1024 * 1024;

    for (const item of files) {
      if (item.file.size > MAX) return 'Κάποιο αρχείο είναι πολύ μεγάλο (όριο 200MB).';

      const inferred = fileKindFromMime(item.file.type);
      if (!inferred) return 'Κάποιο αρχείο έχει μη υποστηριζόμενο τύπο.';

      if (dest === 'akolouthies') {
        if (inferred !== 'podcast') return 'Στις Ακολουθίες επιτρέπονται μόνο podcasts (ήχος).';
      } else {
        if (inferred !== kind) return 'Κάποιο αρχείο δεν ταιριάζει με το επιλεγμένο είδος.';
      }
    }

    if (dest === 'akolouthies') {
      if (!akYear || !/^\d{4}$/.test(String(akYear))) return 'Μη έγκυρο έτος.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(akDate)) return 'Μη έγκυρη ημερομηνία (YYYY-MM-DD).';
    }

    return null;
  };

  const uploadAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const v = validate();
    if (v) {
      setStatus(v);
      return;
    }

    setBusy(true);
    setStatus('Ξεκινάει το ανέβασμα αρχείων…');

    let successCount = 0;

    for (const item of files) {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));

      try {
        const payload: any = {
          filename: item.file.name,
          mime: item.file.type,
        };

        if (dest === 'akolouthies') {
          payload.series = 'akolouthies';
          payload.kind = 'podcast';
          payload.year = akYear;
          payload.date = akDate;
        } else {
          payload.kind = kind;
          payload.course = course;
          payload.year = year;
          payload.lesson = lesson;
        }

        const presignRes = await fetch('/api/files/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!presignRes.ok) {
          const errJson = await presignRes.json().catch(() => ({}));
          throw new Error(errJson?.error || `Presign failed (${presignRes.status})`);
        }

        const { url, key } = await presignRes.json();
        if (!url || !key) throw new Error('Άκυρη απάντηση από το presign.');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);

          xhr.upload.onprogress = (evt) => {
            if (!evt.lengthComputable) return;
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)));
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100, key } : f)));
              resolve();
            } else {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error κατά το ανέβασμα'));

          xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
          xhr.send(item.file);
        });

        successCount += 1;
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'error', error: err?.message || String(err) } : f
          )
        );
      }
    }

    if (successCount === 0) setStatus('Αποτυχία ανεβάσματος για όλα τα αρχεία.');
    else if (successCount < files.length) setStatus(`Ολοκληρώθηκαν ${successCount} από τα ${files.length} αρχεία.`);
    else {
      setStatus('Όλα τα αρχεία ανέβηκαν επιτυχώς.');
      setTimeout(() => (window.location.href = '/material'), 650);
    }

    setBusy(false);
  };

  return (
    <div className="max-w-xl mx-auto card p-6 space-y-6">
      <h1 className="font-heading text-xl font-semibold">Ανέβασμα Αρχείων</h1>

      <form onSubmit={uploadAll} className="space-y-4">
        <div>
          <label className="text-sm text-muted">Προορισμός</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="radio" name="dest" value="lessons" checked={dest === 'lessons'} onChange={() => setDest('lessons')} />
              <span>Μαθήματα</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="radio" name="dest" value="akolouthies" checked={dest === 'akolouthies'} onChange={() => setDest('akolouthies')} />
              <span>Ακολουθίες</span>
            </label>
          </div>
        </div>

        {dest === 'lessons' && (
          <>
            <div>
              <label className="text-sm text-muted">Είδος αρχείου</label>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="kind" value="podcast" checked={kind === 'podcast'} onChange={() => setKind('podcast')} />
                  <span>Podcast (ήχος)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="kind" value="pdf" checked={kind === 'pdf'} onChange={() => setKind('pdf')} />
                  <span>PDF</span>
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted">Κατηγορία</label>
                <select className="input mt-1" value={course} onChange={(e) => setCourse(e.target.value as CourseKey)}>
                  {COURSES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted">Έτος</label>
                <select className="input mt-1" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted">Μάθημα #</label>
                <select className="input mt-1" value={lesson} onChange={(e) => setLesson(Number(e.target.value))}>
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

        {dest === 'akolouthies' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Έτος</label>
              <input className="input mt-1" value={String(akYear)} onChange={(e) => setAkYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-muted">Ημερομηνία (YYYY-MM-DD)</label>
              <input className="input mt-1" value={akDate} onChange={(e) => setAkDate(e.target.value)} />
            </div>
          </div>
        )}

        <div
          className={
            'mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ' +
            (dragOver ? 'border-blue-600 bg-[rgba(0,0,0,0.02)]' : 'border-subtle')
          }
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <p className="text-sm text-muted mb-3">Σύρετε και αφήστε αρχεία εδώ ή πατήστε για επιλογή.</p>
          <input id="file-input" type="file" className="hidden" multiple accept={accept} onChange={onInputChange} />
          <button type="button" className="btn btn-outline" onClick={() => document.getElementById('file-input')?.click()}>
            Επιλογή αρχείων
          </button>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">Επιλεγμένα αρχεία: {files.length}</div>
              <button type="button" className="text-xs text-muted hover:underline" onClick={clearList} disabled={busy}>
                Εκκαθάριση λίστας
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((f) => (
                <div key={f.id} className="border border-subtle rounded-md px-3 py-2 flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-md bg-[rgba(0,0,0,0.05)] flex items-center justify-center text-[11px]">
                    {fileKindFromMime(f.file.type) === 'pdf' ? 'PDF' : 'AUDIO'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{f.file.name}</div>
                    <div className="text-[11px] text-muted">{Math.round(f.file.size / 1024)} KB</div>
                    <div className="mt-1 h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                      <div
                        className={
                          'h-full ' +
                          (f.status === 'error' ? 'bg-red-600' : f.status === 'done' ? 'bg-green-600' : 'bg-[var(--muted)]')
                        }
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] min-w-[70px] text-right">
                    {f.status === 'pending' && 'Έτοιμο'}
                    {f.status === 'uploading' && `${f.progress}%`}
                    {f.status === 'done' && 'ΟΚ'}
                    {f.status === 'error' && 'Σφάλμα'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <a href="/material" className="btn btn-outline">
            Πίσω στο Υλικό
          </a>
          <button className="btn btn-gold" type="submit" disabled={files.length === 0 || busy}>
            {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
          </button>
        </div>
      </form>

      {status && <div className="text-sm text-muted border-t border-subtle pt-3">{status}</div>}
    </div>
  );
}