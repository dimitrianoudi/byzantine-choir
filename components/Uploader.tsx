'use client';

import { useMemo, useState } from 'react';

type CourseKey = 'kids' | 'women' | 'men';

const COURSES: { key: CourseKey; label: string }[] = [
  { key: 'kids', label: 'Ψαλτική παιδικής φωνής' },
  { key: 'women', label: 'Ψαλτική γυναικείας φωνής' },
  { key: 'men', label: 'Ψαλτική ανδρικής φωνής' },
];

const YEARS = [2025, 2026];
const LESSONS = Array.from({ length: 30 }, (_, i) => i + 1);

type Series = 'lessons' | 'akolouthies';

type UploadFile = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  key?: string;
};

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  initial?: { series?: string; prefix?: string; year?: string; date?: string };
};

export default function Uploader({ initial }: Props) {
  const [series, setSeries] = useState<Series>('lessons');

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [type, setType] = useState<'podcast' | 'pdf'>('podcast');

  const [course, setCourse] = useState<CourseKey>('kids');
  const [year, setYear] = useState<number>(2025);
  const [lesson, setLesson] = useState<number>(1);

  const [akYear, setAkYear] = useState<number>(new Date().getFullYear());
  const [akDate, setAkDate] = useState<string>(todayISO());

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const lockedType = series === 'akolouthies' ? 'podcast' : type;

  const accept = useMemo(() => {
    if (lockedType === 'pdf') return 'application/pdf';
    return 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/mp3';
  }, [lockedType]);

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

  const validateFiles = () => {
    const MAX = 200 * 1024 * 1024;

    for (const item of files) {
      if (item.file.size > MAX) return 'Κάποιο αρχείο είναι πολύ μεγάλο (όριο 200MB).';

      if (lockedType === 'pdf') {
        if (item.file.type !== 'application/pdf') return 'Κάποιο αρχείο δεν είναι PDF.';
      } else {
        const ok = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/mp3'].includes(
          item.file.type
        );
        if (!ok) return 'Κάποιο αρχείο έχει μη υποστηριζόμενο τύπο ήχου.';
      }
    }

    if (series === 'akolouthies') {
      if (!akYear || !akDate) return 'Βάλτε έτος και ημερομηνία.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(akDate)) return 'Η ημερομηνία πρέπει να είναι YYYY-MM-DD.';
    }

    return null;
  };

  const uploadAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (files.length === 0) {
      setStatus('Επιλέξτε ένα ή περισσότερα αρχεία.');
      return;
    }

    const v = validateFiles();
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
        const body =
          series === 'akolouthies'
            ? {
                filename: item.file.name,
                mime: item.file.type,
                kind: 'podcast',
                series: 'akolouthies',
                year: akYear,
                date: akDate,
              }
            : {
                filename: item.file.name,
                mime: item.file.type,
                kind: lockedType,
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
              setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100, key } : f))
              );
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

    if (successCount === 0) {
      setStatus('Αποτυχία ανεβάσματος για όλα τα αρχεία.');
      setBusy(false);
      return;
    }

    if (successCount < files.length) {
      setStatus(`Ολοκληρώθηκαν ${successCount} από τα ${files.length} αρχεία.`);
      setBusy(false);
      return;
    }

    setStatus('Όλα τα αρχεία ανέβηκαν επιτυχώς.');

    const redirectPrefix =
      series === 'akolouthies'
        ? `Ακολουθίες/${akYear}/${akDate}/podcasts/`
        : `μαθήματα/${COURSES.find((c) => c.key === course)?.label || course}/${year}/Μάθημα ${String(lesson).padStart(
            2,
            '0'
          )}/${lockedType === 'pdf' ? 'pdfs' : 'podcasts'}/`;

    setTimeout(() => {
      window.location.href = `/material?prefix=${encodeURIComponent(redirectPrefix)}`;
    }, 600);

    setBusy(false);
  };

  const onChangeSeries = (s: Series) => {
    setSeries(s);
    setFiles([]);
    setStatus(null);
    if (s === 'akolouthies') setType('podcast');
  };

  return (
    <div className="max-w-xl mx-auto card p-6 space-y-6">
      <h1 className="font-heading text-xl font-semibold mb-2">
        Ανέβασμα Αρχείων
      </h1>

      <form onSubmit={uploadAll} className="space-y-4">
        <div>
          <label className="text-sm text-muted">Κατηγορία ανεβάσματος</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="series"
                value="lessons"
                checked={series === 'lessons'}
                onChange={() => onChangeSeries('lessons')}
              />
              <span>Μαθήματα</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="series"
                value="akolouthies"
                checked={series === 'akolouthies'}
                onChange={() => onChangeSeries('akolouthies')}
              />
              <span>Ακολουθίες</span>
            </label>
          </div>
        </div>

        {series === 'lessons' && (
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

        {series === 'akolouthies' && (
          <>
            <div className="card p-4">
              <div className="text-sm text-muted">Ακολουθίες: ανεβαίνουν μόνο αρχεία ήχου (podcasts).</div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">Έτος</label>
                <input className="input mt-1" type="number" value={akYear} onChange={(e) => setAkYear(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm text-muted">Ημερομηνία (Κυριακή)</label>
                <input className="input mt-1" type="date" value={akDate} onChange={(e) => setAkDate(e.target.value)} />
              </div>
            </div>
          </>
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
          <input
            type="file"
            className="hidden"
            id="file-input"
            multiple
            accept={accept}
            onChange={onInputChange}
          />
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
                  <div className="w-8 h-8 rounded-md bg-[rgba(0,0,0,0.05)] flex items-center justify-center text-xs">
                    {lockedType === 'pdf' ? 'PDF' : 'AUDIO'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{f.file.name}</div>
                    <div className="text-[11px] text-muted">{Math.round(f.file.size / 1024)} KB</div>
                    <div className="mt-1 h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                      <div
                        className={
                          'h-full rounded-full ' +
                          (f.status === 'error'
                            ? 'bg-red-600'
                            : f.status === 'done'
                            ? 'bg-green-600'
                            : 'bg-[var(--muted)]')
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
          <a href="/material" className="btn btn-outline">Πίσω στο Υλικό</a>
          <button className="btn btn-gold" type="submit" disabled={files.length === 0 || busy}>
            {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
          </button>
        </div>
      </form>

      {status && <div className="text-sm text-muted border-t border-subtle pt-3">{status}</div>}
    </div>
  );
}
