'use client';

import { useEffect, useMemo, useState } from 'react';
import EventModal from '@/components/EventModal';
import type { ChoirEvent } from '@/lib/gcal';

type Role = "member" | "admin";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function toKey(d: Date) { return d.toISOString().split('T')[0]; }

export default function CalendarView({ role }: { role: Role }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [events, setEvents] = useState<ChoirEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChoirEvent | null>(null);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch("/api/events", { cache: "no-store" });
    const json = await res.json();
    setEvents(json.events || []);
    setLoading(false);
  }

  useEffect(() => { fetchEvents(); }, []);

  const eventsByDay = useMemo(() => {
    const map: Record<string, ChoirEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  const first = startOfMonth(cursor);
  const last  = endOfMonth(cursor);

  // Build grid (Mon–Sun)
  const weekStartsOn = 1;
  const firstWeekday = (first.getDay() + 6) % 7; // 0=Mon
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

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }), []);
  const dayNum = useMemo(() => new Intl.DateTimeFormat('el-GR', { day: 'numeric' }), []);
  const weekdayLabels = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(e => new Date(e.startsAt) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a,b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 6);
  }, [events]);

  // ⬇️ Match EventModal's onSave signature exactly
  const saveEvent = async (evt: Omit<ChoirEvent, "id"> & { id?: string }) => {
    const method = evt.id ? "PUT" : "POST";
    const res = await fetch("/api/events", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: evt }),
    });
    if (!res.ok) {
      alert("Αποτυχία αποθήκευσης");
      return;
    }
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Διαγραφή εκδήλωσης;")) return;
    const res = await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      alert("Αποτυχία διαγραφής");
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
          <button className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Σήμερα</button>
          <button className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹ Προηγ.</button>
          <button className="btn btn-outline btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Επόμ. ›</button>
          {role === "admin" && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={() => { 
                console.debug("NEW_EVENT_CLICK");
                setEditing(null);
                setModalOpen(true);
              }}
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
            {weekdayLabels.map((w) => <div key={w} className="text-center">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const key = toKey(d);
              const evts = eventsByDay[key] || [];
              return (
                <div key={i} className="border-subtle rounded-md border p-2 min-h-[84px] flex flex-col" style={{ background: inMonth ? '#fff' : '#f8fafc' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: isToday ? 'var(--blue-600)' : 'inherit', fontWeight: isToday ? 700 : 500 }}>
                      {dayNum.format(d)}
                    </div>
                    {isToday && <span className="text-xs text-blue">σήμερα</span>}
                  </div>

                  <div className="mt-1 space-y-1">
                    {evts.slice(0, 3).map(e => (
                      <div key={e.id} className="text-xs truncate px-2 py-1 rounded-md" style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }} title={e.title + (e.location ? ` — ${e.location}` : '')}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{e.title}</span>
                          {role === "admin" && (
                            <span className="ml-auto flex gap-1">
                              <button className="text-[11px] btn btn-outline" onClick={() => { setEditing(e); setModalOpen(true); }}>Επεξ.</button>
                              <button className="text-[11px] btn btn-outline" onClick={() => deleteEvent(e.id)}>Διαγρ.</button>
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

        {/* Upcoming */}
        <div className="card p-4 space-y-3">
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

      {/* Modal */}
      {role === "admin" && (
        <EventModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={editing}
          onSave={saveEvent}
        />
      )}
    </div>
  );
}
