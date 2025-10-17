'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChoirEvent } from '@/lib/gcal';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: ChoirEvent | null; // if provided → edit mode
  // must accept exactly what CalendarView sends
  onSave: (evt: Omit<ChoirEvent, 'id'> & { id?: string }) => Promise<void>;
};

export default function EventModal({ open, onClose, initial, onSave }: Props) {
  const isEdit = !!initial?.id;

  // Local form state
  const [title, setTitle] = useState('');
  const [startsLocal, setStartsLocal] = useState(''); // yyyy-MM-ddTHH:mm (local)
  const [endsLocal, setEndsLocal] = useState('');     // yyyy-MM-ddTHH:mm (local)
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill when opening / editing
  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setTitle(initial?.title || '');
    setLocation(initial?.location || '');

    // Convert ISO → local input string (yyyy-MM-ddTHH:mm)
    const isoToLocal = (iso?: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      // guard invalid
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    setStartsLocal(isoToLocal(initial?.startsAt) || '');
    setEndsLocal(isoToLocal(initial?.endsAt) || '');
  }, [open, initial]);

  // Build payload on submit: local → ISO (keeps local time as specified by user)
  const localToISO = (local: string) => {
    if (!local) return '';
    const d = new Date(local);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  };

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && !!startsLocal;
  }, [title, startsLocal]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,27,63,0.35)' }}
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
            <input
              className="input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="π.χ. Μάθημα Ψαλτικής"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted">Έναρξη</label>
            <input
              className="input mt-1"
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted">Λήξη (προαιρετικό)</label>
            <input
              className="input mt-1"
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-muted">Τοποθεσία (προαιρετικό)</label>
            <input
              className="input mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="π.χ. Ι.Ν. Αγ. Αθανασίου"
            />
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>

        <div className="actions justify-end mt-4">
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>
            Άκυρο
          </button>
          <button
            className="btn btn-gold"
            onClick={async () => {
              if (!canSubmit) {
                setError('Συμπληρώστε τίτλο και έναρξη.');
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await onSave({
                  id: initial?.id, // undefined for create, value for edit
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
            disabled={!canSubmit || busy}
          >
            {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    </div>
  );
}
