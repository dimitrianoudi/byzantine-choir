'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChoirEvent } from '@/lib/gcal';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: ChoirEvent | null;
  onSave: (evt: Omit<ChoirEvent, 'id'> & { id?: string }) => Promise<void>;
};

export default function EventModal({ open, onClose, initial, onSave }: Props) {
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState('');
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setTitle(initial?.title || '');
    setLocation(initial?.location || '');

    const isoToLocal = (iso?: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartsLocal(isoToLocal(initial?.startsAt) || '');
    setEndsLocal(isoToLocal(initial?.endsAt) || '');
  }, [open, initial]);

  const localToISO = (local: string) => {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  };

  const canSubmit = useMemo(() => title.trim() && startsLocal, [title, startsLocal]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(10,27,63,0.35)', zIndex: 1000 }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="card p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>
          {isEdit ? 'Επεξεργασία Εκδήλωσης' : 'Νέα Εκδήλωση'}
        </h3>

        <div className="space-y-3 mt-3">
          <div>
            <label className="text-sm text-muted">Τίτλος</label>
            <input className="input mt-1" value={title} onChange={e=>setTitle(e.target.value)} placeholder="π.χ. Μάθημα Ψαλτικής" />
          </div>
          <div>
            <label className="text-sm text-muted">Έναρξη</label>
            <input className="input mt-1" type="datetime-local" value={startsLocal} onChange={e=>setStartsLocal(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">Λήξη (προαιρετικό)</label>
            <input className="input mt-1" type="datetime-local" value={endsLocal} onChange={e=>setEndsLocal(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">Τοποθεσία (προαιρετικό)</label>
            <input className="input mt-1" value={location} onChange={e=>setLocation(e.target.value)} placeholder="π.χ. Ι.Ν. Αγ. Αθανασίου" />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>

        <div className="actions justify-end mt-4">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Άκυρο</button>
          <button
            type="button"
            className="btn btn-gold"
            disabled={!canSubmit || !!busy}
            onClick={async () => {
              try {
                setBusy(true);
                await onSave({
                  id: initial?.id,
                  title: title.trim(),
                  startsAt: localToISO(startsLocal),
                  endsAt: endsLocal ? localToISO(endsLocal) : undefined,
                  location: location.trim() || undefined,
                });
                onClose();
              } catch (e: any) {
                setError(e?.message || 'Αποτυχία αποθήκευσης');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    </div>
  );
}
