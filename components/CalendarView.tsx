'use client';

import { useEffect, useMemo, useState } from 'react';

type Role = 'member' | 'admin';

type ChoirEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
};

type RecurrenceInput = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  until?: string;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function keyFromLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}
function toKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function CalendarView({ role }: { role: Role }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [events, setEvents] = useState<ChoirEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChoirEvent | null>(null);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      const json = await res.json();
      setEvents(Array.isArray(json.events) ? json.events : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchEvents(); }, []);

  // Map events by local day
  const eventsByDay = useMemo(() => {
    const map: Record<string, ChoirEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = keyFromLocalDate(d);
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  // Build month grid days
  const first = startOfMonth(cursor);
  const last  = endOfMonth(cursor);

  const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
  const days: Date[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(first); d.setDate(first.getDate() - (firstWeekday - i));
    days.push(d);
  }
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) days.push(new Date(d));
  while (days.length % 7 !== 0) {
    const prev = days[days.length - 1];
    days.push(addDays(prev, 1));
  }

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }), []);
  const dayNum = useMemo(() => new Intl.DateTimeFormat('el-GR', { day: 'numeric' }), []);
  const weekdayLabels = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

  const upcoming = useMemo(() => {
    const now = new Date();
    const floor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...events]
      .filter(e => new Date(e.startsAt) >= floor)
      .sort((a,b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 6);
  }, [events]);

  const isoToLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const localToRFC3339 = (local: string) => local ? `${local}:00` : '';

  const saveEvent = async (evt: Omit<ChoirEvent, 'id'> & { id?: string; recurrence?: RecurrenceInput }) => {
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

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          {monthFormatter.format(cursor)}
        </h1>
        <div className="header-spacer" />
        <div className="actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Σήμερα</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹ Προηγ.</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Επόμ. ›</button>
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
        {/* Calendar area */}
        <div className="lg:col-span-2 card p-5">

          {/* DESKTOP/TABLET: month grid */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-7 gap-2 text-sm text-muted mb-2 px-3">
              {weekdayLabels.map((w) => <div key={w} className="text-center">{w}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = sameDay(d, today);
                const key = keyFromLocalDate(d);
                const evts = eventsByDay[key] || [];
                return (
                  <div key={i} className="border-subtle rounded-md border p-3 min-h-[84px] flex flex-col" style={{ background: inMonth ? '#fff' : '#f8fafc' }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm" style={{ color: isToday ? 'var(--blue-600)' : 'inherit', fontWeight: isToday ? 700 : 500 }}>
                        {dayNum.format(d)}
                      </div>
                      {isToday && <span className="text-xs text-blue">σήμερα</span>}
                    </div>

                    <div className="mt-1 space-y-1">
                      {evts.slice(0, 3).map(e => (
                        <div key={e.id} className="text-[11px] truncate px-2 py-1 rounded-md" style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }} title={e.title + (e.location ? ` — ${e.location}` : '')}>
                          <div className="flex items-center gap-2">
                            <span className="truncate">{e.title}</span>
                            {role === 'admin' && (
                              <span className="ml-auto flex gap-1">
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Επεξεργασία"
                                  aria-label="Επεξεργασία"
                                  onClick={() => { setEditing(e); setModalOpen(true); }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                    <path d="M14.06 4.94l3.75 3.75" stroke="currentColor" strokeWidth="1.5"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Διαγραφή"
                                  aria-label="Διαγραφή"
                                  onClick={() => deleteEvent(e.id)}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M9 3h6m-9 4h12M9 7v12m6-12v12M5 7l1 14h12l1-14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {evts.length > 3 && <div className="text-[11px] text-muted">+{evts.length - 3} ακόμη</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE: agenda-style list */}
          <div className="sm:hidden space-y-3">
            {days
              .filter(d => d.getMonth() === cursor.getMonth())
              .map((d) => {
                const key = keyFromLocalDate(d);
                const evts = eventsByDay[key] || [];
                const isToday = sameDay(d, today);
                return (
                  <div key={key} className="border border-subtle rounded-md p-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="text-sm font-semibold">
                        {new Intl.DateTimeFormat('el-GR', { weekday: 'short', day: '2-digit', month: 'short' }).format(d)}
                      </div>
                      {isToday && <span className="text-xs text-blue">σήμερα</span>}
                    </div>

                    {evts.length === 0 ? (
                      <div className="text-xs text-muted">—</div>
                    ) : (
                      <div className="space-y-2">
                        {evts.map(e => {
                          const when = new Date(e.startsAt);
                          const time = e.endsAt
                            ? new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit' }).format(when)
                            : new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit' }).format(when);

                          return (
                            <div key={e.id} className="flex items-start gap-2">
                              <div className="text-[11px] text-muted mt-0.5 shrink-0 w-12">{time}</div>
                              <div className="flex-1">
                                <div className="text-[13px] font-medium leading-4">{e.title}</div>
                                {e.location && <div className="text-[11px] text-muted">{e.location}</div>}
                              </div>
                              {role === 'admin' && (
                                <div className="shrink-0 flex gap-1">
                                  <button className="icon-btn" onClick={() => { setEditing(e); setModalOpen(true); }} aria-label="Επεξεργασία">✎</button>
                                  <button className="icon-btn" onClick={() => deleteEvent(e.id)} aria-label="Διαγραφή">🗑</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <p>&nbsp;</p>

        {/* Upcoming */}
        <div className="card p-4 space-y-3 mt-4 sm:mt-0">
          <h2 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>Επερχόμενα</h2>
          {loading && <div className="text-sm text-muted">Φόρτωση…</div>}
          {!loading && upcoming.length === 0 && <div className="text-sm text-muted">Δεν υπάρχουν προσεχείς εκδηλώσεις.</div>}
          <div className="space-y-2">
            {upcoming.map(e => {
              const d = new Date(e.startsAt);
              const dayLabel = new Intl.DateTimeFormat('el-GR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
              return (
                <div key={e.id} className="border border-subtle rounded-md p-2">
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-xs text-muted">{dayLabel}{e.location ? ` · ${e.location}` : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inline Modal (centered, constrained width) */}
      {role === 'admin' && modalOpen && (
        <div
          onClick={() => { setModalOpen(false); setEditing(null); }}
          aria-modal="true"
          role="dialog"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10,27,63,0.35)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '20px',
              borderRadius: '12px',
              background: '#fff'
            }}
          >
            <h3 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 18 }}>
              {editing ? 'Επεξεργασία Εκδήλωσης' : 'Νέα Εκδήλωση'}
            </h3>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-sm text-muted">Τίτλος</label>
                <input className="input input--wide mt-1" id="evt-title" defaultValue={editing?.title || ''} placeholder="π.χ. Μάθημα Ψαλτικής" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted">Έναρξη</label>
                  <input className="input mt-1" id="evt-start" type="datetime-local" defaultValue={editing?.startsAt ? isoToLocal(editing.startsAt) : ''} />
                </div>
                <div>
                  <label className="text-sm text-muted">Λήξη (προαιρετικό)</label>
                  <input className="input mt-1" id="evt-end" type="datetime-local" defaultValue={editing?.endsAt ? isoToLocal(editing.endsAt) : ''} />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted">Τοποθεσία (προαιρετικό)</label>
                <input className="input mt-1" id="evt-loc" defaultValue={editing?.location || ''} placeholder="π.χ. Ι.Ν. Αγ. Αθανασίου" />
              </div>

              {/* Recurrence */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted">Επανάληψη</label>
                  <select className="input mt-1" id="evt-repeat" defaultValue="none">
                    <option value="none">Καμία</option>
                    <option value="weekly">Κάθε εβδομάδα</option>
                    <option value="monthly">Κάθε μήνα</option>
                    <option value="yearly">Κάθε χρόνο</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted">Μέχρι (προαιρετικό)</label>
                  <input className="input mt-1" id="evt-until" type="date" />
                </div>
              </div>
            </div>

            <div className="actions justify-end mt-4">
              <button type="button" className="btn btn-outline" onClick={() => { setModalOpen(false); setEditing(null); }}>
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
                  const repeat = (document.getElementById('evt-repeat') as HTMLSelectElement)?.value as 'none'|'weekly'|'monthly'|'yearly';
                  const until = (document.getElementById('evt-until') as HTMLInputElement)?.value || undefined;

                  if (!title || !startsLocal) { alert('Τίτλος και Έναρξη απαιτούνται'); return; }

                  let recurrence: RecurrenceInput | undefined = undefined;
                  if (repeat !== 'none') {
                    const freq: RecurrenceInput['freq'] =
                      repeat === 'weekly' ? 'WEEKLY' :
                      repeat === 'monthly' ? 'MONTHLY' : 'YEARLY';
                    recurrence = { freq, interval: 1, ...(until ? { until } : {}) };
                  }

                  await saveEvent({
                    id: editing?.id,
                    title,
                    startsAt: localToRFC3339(startsLocal),
                    endsAt: endsLocal ? localToRFC3339(endsLocal) : undefined,
                    location: location || undefined,
                    recurrence,
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
