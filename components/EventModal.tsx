'use client';

import { useEffect, useState } from "react";
import type { ChoirEvent } from "@/lib/events";

export default function EventModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (evt: Omit<ChoirEvent, "id"> & { id?: string }) => Promise<void>;
  initial?: ChoirEvent | null;
}) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setTitle(initial?.title || "");
    setStartsAt(initial?.startsAt ? initial.startsAt.slice(0,16) : "");
    setEndsAt(initial?.endsAt ? initial.endsAt.slice(0,16) : "");
    setLocation(initial?.location || "");
  }, [initial, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,27,63,0.35)" }}
      onClick={onClose}
    >
      <div className="card p-5 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
        <h3 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>
          {initial ? "Επεξεργασία Εκδήλωσης" : "Νέα Εκδήλωση"}
        </h3>

        <div className="space-y-3 mt-3">
          <div>
            <label className="text-sm text-muted">Τίτλος</label>
            <input className="input mt-1" value={title} onChange={e=>setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-muted">Έναρξη</label>
            <input className="input mt-1" type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-muted">Λήξη (προαιρετικό)</label>
            <input className="input mt-1" type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted">Τοποθεσία (προαιρετικό)</label>
            <input className="input mt-1" value={location} onChange={e=>setLocation(e.target.value)} />
          </div>
        </div>

        <div className="actions justify-end mt-4">
          <button className="btn btn-outline" onClick={onClose}>Άκυρο</button>
          <button
            className="btn btn-gold"
            onClick={async ()=>{
              await onSave({
                id: initial?.id,
                title,
                startsAt: startsAt ? new Date(startsAt).toISOString() : "",
                endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
                location: location || undefined,
              });
              onClose();
            }}
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}
