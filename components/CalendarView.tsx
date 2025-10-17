'use client';

import { useEffect, useMemo, useState } from 'react';

type Role = 'member' | 'admin';

type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string;
  location?: string;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function toKey(d: Date) { return d.toISOString().split('T')[0]; }

export default function CalendarView({ role }: { role: Role }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [events, setEvents] = useState<ChoirEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChoirEvent | null>(null);

  // Fetch events
  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      const json = await res.json();
      setEvents(json.events || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEvents(); }, []);

  // Index by day
  const eventsByDay = useMemo(() => {
    const map: Record<string, ChoirEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  // Build month grid (Mon → Sun)
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);

  const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
  const days: Date[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(first); d.setDate(first.getDate() - (firstWeekday - i));
    days.push(d);
  }
  for (let d = new Date(first); d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(new Date(d));
  }
  while (days.length % 7 !== 0) {
    const prev = days[days.length - 1];
    days.push(new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  }

  // Labels
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }), []);
  const dayNum = useMemo(() => new Intl.DateTimeFormat('el-GR', { day: 'numeric' }), []);
  const weekdayLabels = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(e => new Date(e.startsAt) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 6);
  }, [events]);

  // Create/Update via API
  const saveEvent = async (evt: Omit<ChoirEvent, 'id'> & { id?: string }) => {
    const method = evt.id ? 'PUT' : 'POST';
    const res = await fetch('/api/events', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: evt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Αποτυχία αποθήκευσης');
      return;
    }
    await fetchEvents();
  };

  // Delete via API
  const deleteEvent = async (id: string) => {
    if (!confirm('Διαγραφή εκδήλωσης;')) return;
    const res = await fetch('/api/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Αποτυχία διαγραφής');
      return;
    }
    await fetchEvents();
  };

  // Helpers for inline modal
  const isoToLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const localToISO = (local: string) => {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          {monthFormatter.format(cursor)}
        </h1>
        <div className="header-spacer" />
        <div className="actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Σήμερα
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            ‹ Προηγ.
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Επόμ. ›
          </button>

          {role === 'admin' && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={() => { setEditing(null); setModalOpen(true); }}
            >
              Νέα Εκδήλωση
            </button>
          )}
        </div>
      </div>

      {/* Grid + Upcoming */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 card pr-4 pt-4 pb-4 pl-0">
          <div className="grid grid-cols-7 gap-2 text-sm text-muted mb-2">
            {weekdayLabels.map((w) => (
              <div key={w} className="text-center">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const key = toKey(d);
              const evts = eventsByDay[key] || [];
              return (
                <div
                  key={i}
                  className="border-subtle rounded-md border p-2 min-h-[84px] flex flex-col"
                  style={{ background: inMonth ? '#fff' : '#f8fafc' }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="text-sm"
                      style={{ color: isToday ? 'var(--blue-600)' : 'inherit', fontWeight: isToday ? 700 : 500 }}
                    >
                      {dayNum.format(d)}
                    </div>
                    {isToday && <span className="text-xs text-blue">σήμερα</span>}
                  </div>

                  <div className="mt-1 space-y-1">
                    {evts.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="text-xs truncate px-2 py-1 rounded-md"
                        style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }}
                        title={e.title + (e.location ? ` — ${e.location}` : '')}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{e.title}</span>
                          {role === 'admin' && (
                            <span className="ml-auto flex gap-1">
                              <button
                                type="button"
                                className="text-[11px] btn btn-outline"
                                onClick={() => { setEditing(e); setModalOpen(true); }}
                              >
                                Επεξ.
                              </button>
                              <button
                                type="button"
                                className="text-[11px] btn btn-outline"
                                onClick={() => deleteEvent(e.id)}
                              >
                                Διαγρ.
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {evts.length > 3 && (
                      <div className="text-[11px] text-muted">+{evts.length - 3} ακόμη</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card p-4 space-y-3">
          <h2 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>Επερχόμενα</h2>
          {loading && <div className="text-sm text-muted">Φόρτωση…</div>}
          {!loading && upcoming.length === 0 && (
            <div className="text-sm text-muted">Δεν υπάρχουν προσεχείς εκδηλώσεις.</div>
          )}
          <div className="space-y-2">
            {upcoming.map((e) => {
              const d = new Date(e.startsAt);
              const dayLabel = new Intl.DateTimeFormat('el-GR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(d);
              return (
                <div key={e.id} className="border border-subtle rounded-md p-2">
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-xs text-muted">
                    {dayLabel}{e.location ? ` · ${e.location}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Inline Modal (admin only) --- */}
      {role === 'admin' && modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(10,27,63,0.35)', zIndex: 2000 }}
          onClick={() => { setModalOpen(false); setEditing(null); }}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="card p-5 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>
              {editing ? 'Επεξεργασία Εκδήλωσης' : 'Νέα Εκδήλωση'}
            </h3>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-sm text-muted">Τίτλος</label>
                <input
                  className="input mt-1"
                  id="evt-title"
                  defaultValue={editing?.title || ''}
                  placeholder="π.χ. Μάθημα Ψαλτικής"
                />
              </div>
              <div>
                <label className="text-sm text-muted">Έναρξη</label>
                <input
                  className="input mt-1"
                  id="evt-start"
                  type="datetime-local"
                  defaultValue={editing?.startsAt ? isoToLocal(editing.startsAt) : ''}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Λήξη (προαιρετικό)</label>
                <input
                  className="input mt-1"
                  id="evt-end"
                  type="datetime-local"
                  defaultValue={editing?.endsAt ? isoToLocal(editing.endsAt) : ''}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Τοποθεσία (προαιρετικό)</label>
                <input
                  className="input mt-1"
                  id="evt-loc"
                  defaultValue={editing?.location || ''}
                  placeholder="π.χ. Ι.Ν. Αγ. Αθανασίου"
                />
              </div>
            </div>

            <div className="actions justify-end mt-4">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setModalOpen(false); setEditing(null); }}
              >
                Άκυρο
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={async () => {
                  const title = (document.getElementById('evt-title') as HTMLInputElement)?.value?.trim();
                  const startsLocal = (document.getElementById('evt-start') as HTMLInputElement)?.value;
                  const endsLocal = (document.getElementById('evt-end') as HTMLInputElement)?.value;
                  const location = (document.getElementById('evt-loc') as HTMLInputElement)?.value?.trim();

                  if (!title || !startsLocal) { alert('Τίτλος και Έναρξη απαιτούνται'); return; }

                  await saveEvent({
                    id: editing?.id,
                    title,
                    startsAt: localToISO(startsLocal),
                    endsAt: endsLocal ? localToISO(endsLocal) : undefined,
                    location: location || undefined,
                  });

                  setModalOpen(false);
                  setEditing(null);
                }}
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
