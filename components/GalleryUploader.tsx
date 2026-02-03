'use client';

import { useEffect, useState } from 'react';

type GalleryFile = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

type Props = {
  onUploaded?: () => void;
  folder?: string;
};

export default function GalleryUploader({ onUploaded, folder = '' }: Props) {
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => { files.forEach(f => URL.revokeObjectURL(f.previewUrl)); };
  }, []);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const next: GalleryFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const id = `${Date.now()}-${i}-${f.name}`;
      const previewUrl = URL.createObjectURL(f);
      next.push({ id, file: f, previewUrl, progress: 0, status: 'pending' });
    }

    setFiles(prev => [...prev, ...next]);
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
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setStatus(null);
  };

  const uploadAll = async () => {
    if (files.length === 0) { setStatus('Επιλέξτε ένα ή περισσότερα αρχεία.'); return; }

    setBusy(true);
    setStatus('Ξεκινάει το ανέβασμα στο gallery…');

    let successCount = 0;

    try {
      for (const item of files) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f));

        const signRes = await fetch('/api/gallery/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder }),
        });

        if (!signRes.ok) {
          const err = await signRes.json().catch(() => ({}));
          throw new Error(err?.error || 'Αποτυχία υπογραφής upload');
        }

        const { timestamp, signature, folder: signedFolder, public_id: signedPublicId, cloudName, apiKey } = await signRes.json();

        const form = new FormData();
        form.append('file', item.file);
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('signature', signature);
        // Use public_id (includes path) so list-by-prefix works; fallback to folder for backwards compatibility
        if (signedPublicId) {
          form.append('public_id', signedPublicId);
        } else {
          form.append('folder', signedFolder);
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`);

          xhr.upload.onprogress = (evt) => {
            if (!evt.lengthComputable) return;
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
              resolve();
            } else {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error κατά το ανέβασμα'));
          xhr.send(form);
        });

        successCount += 1;
        if (onUploaded) onUploaded();
      }

      if (successCount === files.length) setStatus('Το gallery ενημερώθηκε με επιτυχία.');
      else if (successCount > 0) setStatus(`Ολοκληρώθηκαν ${successCount} από τα ${files.length} αρχεία.`);
      else setStatus('Αποτυχία ανεβάσματος όλων των αρχείων.');
    } catch (err: any) {
      setStatus(err?.message || 'Σφάλμα ανεβάσματος');
    }

    setBusy(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">Ανέβασμα στο Gallery</h2>
        <button type="button" className="btn btn-gold btn-sm" onClick={uploadAll} disabled={files.length === 0 || busy}>
          {busy ? 'Ανέβασμα…' : 'Ανέβασμα'}
        </button>
      </div>

      <div
        className={'border-2 border-dashed rounded-lg p-4 text-center transition-colors ' + (dragOver ? 'border-blue-600 bg-[rgba(0,0,0,0.02)]' : 'border-subtle')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <p className="text-sm text-muted mb-3">Σύρετε φωτογραφίες ή βίντεο εδώ ή πατήστε για επιλογή.</p>
        <input id="gallery-file-input" type="file" multiple accept="image/*,video/*" className="hidden" onChange={onInputChange} />
        <button type="button" className="btn btn-outline btn-sm" onClick={() => document.getElementById('gallery-file-input')?.click()}>
          Επιλογή αρχείων
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">Επιλεγμένα: {files.length}</div>
            <button type="button" className="text-xs text-muted hover:underline" onClick={clearList} disabled={busy}>
              Εκκαθάριση
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
            {files.map(f => (
              <div key={f.id} className="relative border border-subtle rounded-lg overflow-hidden bg-[rgba(0,0,0,0.03)]">
                <img src={f.previewUrl} alt={f.file.name} className="w-full h-28 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.55)] text-[10px] text-white px-2 py-1 flex items-center justify-between gap-1">
                  <span className="truncate">{f.file.name}</span>
                  <span>
                    {f.status === 'pending' && 'Έτοιμο'}
                    {f.status === 'uploading' && `${f.progress}%`}
                    {f.status === 'done' && 'ΟΚ'}
                    {f.status === 'error' && 'Σφάλμα'}
                  </span>
                </div>
                <div className="absolute left-0 right-0 bottom-0 h-1 bg-[rgba(255,255,255,0.2)]">
                  <div
                    className={'h-full ' + (f.status === 'error' ? 'bg-red-600' : f.status === 'done' ? 'bg-green-500' : 'bg-[var(--muted)]')}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status && <div className="text-xs text-muted">{status}</div>}
    </div>
  );
}
