'use client';

import { useState } from 'react';

type CourseKey = 'kids' | 'women' | 'men';

const COURSES: { key: CourseKey; label: string }[] = [
  { key: 'kids', label: 'Ψαλτική παιδικής φωνής' },
  { key: 'women', label: 'Ψαλτική γυναικείας φωνής' },
  { key: 'men', label: 'Ψαλτική ανδρικής φωνής' },
];

const YEARS = [2025, 2026];
const LESSONS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function Uploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<'podcast' | 'pdf'>('podcast');
  const [course, setCourse] = useState<CourseKey>('kids');
  const [year, setYear] = useState<number>(2025);
  const [lesson, setLesson] = useState<number>(1);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const MAX = 200 * 1024 * 1024;

  const accept =
    type === 'pdf'
      ? 'application/pdf'
      : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a';

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (!arr.length) return;
    setFiles(prev => [...prev, ...arr]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!files.length) {
      setStatus('Επιλέξτε τουλάχιστον ένα αρχείο.');
      return;
    }

    setBusy(true);

    try {
      const total = files.length;
      let ok = 0;
      let failed = 0;

      for (let i = 0; i < total; i++) {
        const file = files[i];

        if (file.size > MAX) {
          failed++;
          continue;
        }

        const isPdf = type === 'pdf';
        const okType = isPdf
          ? file.type === 'application/pdf'
          : ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'].includes(file.type);

        if (!okType) {
          failed++;
          continue;
        }

        setStatus(`Αρχείο ${i + 1}/${total}: ζητάω URL ανεβάσματος…`);

        try {
          const presignRes = await fetch('/api/files/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              mime: file.type,
              kind: type,
              course,
              year,
              lesson,
            }),
          });

          if (!presignRes.ok) {
            const errJson = await presignRes.json().catch(() => ({}));
            console.error('PRESIGN_ERROR', errJson);
            failed++;
            continue;
          }

          const { url, key } = await presignRes.json();
          if (!url || !key) {
            failed++;
            continue;
          }

          setStatus(`Αρχείο ${i + 1}/${total}: ανεβάζω στο storage…`);

          const putRes = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!putRes.ok) {
            console.error('PUT_ERROR_STATUS', putRes.status);
            failed++;
            continue;
          }

          ok++;
        } catch (err) {
          console.error('UPLOAD_LOOP_ERROR', err);
          failed++;
        }
      }

      if (ok && !failed) {
        setStatus(`OK · ανέβηκαν ${ok}/${total} αρχεία.`);
        setFiles([]);
        window.location.href = '/material';
      } else if (ok && failed) {
        setStatus(`Ολοκλήρωση με μερικά σφάλματα · επιτυχία ${ok}/${total}, αποτυχία ${failed}.`);
        window.location.href = '/material';
      } else {
        setStatus('Αποτυχία ανεβάσματος για όλα τα αρχεία.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto card p-6 space-y-6">
      <h1 className="font-heading text-xl font-semibold mb-2">
        Ανέβασμα Αρχείων Μαθημάτων
      </h1>

      <form onSubmit={submit} className="space-y-4">
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

        <div>
          <label className="text-sm text-muted">
            Αρχεία (μπορείτε να επιλέξετε ή να τα σύρετε μέσα)
          </label>

          <div
            className={[
              'mt-2 border-2 border-dashed rounded-lg p-6 text-sm text-muted',
              'flex flex-col items-center justify-center text-center transition-colors',
              dragActive ? 'border-blue-600 bg-[rgba(0,0,0,0.03)]' : 'border-subtle bg-white',
            ].join(' ')}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
            onDrop={onDrop}
          >
            <p className="text-[13px]">
              Σύρετε εδώ τα αρχεία σας ή πατήστε στο παρακάτω κουμπί.
            </p>
            <label className="mt-3 btn btn-outline cursor-pointer">
              Επιλογή αρχείων
              <input
                type="file"
                accept={accept}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-3 w-full text-left text-xs max-h-32 overflow-auto">
                <div className="font-semibold mb-1">
                  Επιλεγμένα αρχεία: {files.length}
                </div>
                <ul className="space-y-0.5">
                  {files.map((f, i) => (
                    <li key={i} className="truncate">
                      • {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <a href="/material" className="btn btn-outline">
            Πίσω στο Υλικό
          </a>
          <button className="btn btn-gold" type="submit" disabled={!files.length || busy}>
            {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
          </button>
        </div>
      </form>

      {status && (
        <div className="text-sm text-muted border-t border-subtle pt-3">
          {status}
        </div>
      )}
    </div>
  );
}
