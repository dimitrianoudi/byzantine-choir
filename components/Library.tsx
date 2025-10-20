'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import PdfThumb from './PdfThumb';

type Role = 'member' | 'admin';

type Item = {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
  type: 'podcast' | 'pdf';
};

function prettyName(raw: string) {
  const base = (raw || '').split('/').pop() || raw;   // drop folder prefixes
  return base.replace(/^\d{13}[-_]/, '');
}

export default function Library({ role }: { role: Role }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'podcast' | 'pdf'>('podcast');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [presigned, setPresigned] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const podcasts = useMemo(() => items.filter((i) => i.type === 'podcast'), [items]);
  const pdfs = useMemo(() => items.filter((i) => i.type === 'pdf'), [items]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/files/list');
        if (!res.ok) throw new Error(await safeText(res));
        const data = await res.json();
        setItems(data.items || []);
      } catch (e: any) {
        setError(e?.message || 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getUrl = async (key: string) => {
    if (presigned[key]) return presigned[key];

    const res = await fetch('/api/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    if (!res.ok) {
      let msg = 'Αποτυχία δημιουργίας συνδέσμου (presign)';
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        msg = await safeText(res);
      }
      throw new Error(msg || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data?.url) throw new Error('Το presign δεν επέστρεψε URL.');

    setPresigned((prev) => ({ ...prev, [key]: data.url as string }));
    return data.url as string;
  };

  const play = async (key: string) => {
    setActionMsg(null);
    try {
      const url = await getUrl(key);
      setPlayingKey(key);
      const audio = document.getElementById('audio-player') as HTMLAudioElement | null;
      if (audio) {
        audio.src = url;
        await audio.play().catch(() => {});
      }
    } catch (err: any) {
      setActionMsg(err?.message || 'Σφάλμα αναπαραγωγής');
    }
  };

  const openPdf = async (key: string) => {
    setActionMsg(null);
    try {
      const url = await getUrl(key);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setActionMsg(err?.message || 'Σφάλμα ανοίγματος PDF');
    }
  };

  const downloadKey = async (key: string, name: string) => {
    setActionMsg(null);
    try {
      const url = await getUrl(key);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setActionMsg(err?.message || 'Σφάλμα λήψης αρχείου');
    }
  };

  return (
    <div className="space-y-6">
      <div className="toolbar">
        <button
          className={clsx('btn btn-outline', activeTab === 'podcast' && 'btn--selected')}
          onClick={() => setActiveTab('podcast')}
        >
          Podcasts
        </button>
        <button
          className={clsx('btn btn-outline', activeTab === 'pdf' && 'btn--selected')}
          onClick={() => setActiveTab('pdf')}
        >
          PDF
        </button>
      </div>

      {loading && <div className="card p-6">Φόρτωση...</div>}
      {error && <div className="card p-6 text-red-400">{error}</div>}
      {actionMsg && <div className="card p-4 text-amber-600 text-sm">{actionMsg}</div>}

      {!loading && !error && (
        <>
          {/* Podcasts — unchanged */}
          {activeTab === 'podcast' && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {podcasts.length === 0 && <div className="p-4 text-muted">Δεν υπάρχουν ακόμη podcasts.</div>}
              {podcasts.map((p) => (
                <div key={p.key} className="py-4">
                  <div className="flex items-center gap-4" style={{ padding: '0.5rem' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-all">{prettyName(p.name || p.key)}</div>
                      <div className="text-xs text-muted">
                        {p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn" onClick={() => play(p.key)}>
                        {playingKey === p.key ? 'Παίζει...' : 'Αναπαραγωγή'}
                      </button>
                      <button className="btn btn-gold" onClick={() => downloadKey(p.key, p.name)}>
                        Λήψη
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* visible control bar */}
              <div className="border-t border-subtle bg-white p-3">
                <audio id="audio-player" className="w-full h-10 block" controls preload="none" />
              </div>
            </div>
          )}

          {/* PDFs — new layout like podcasts: thumb + info + right-aligned actions */}
          {activeTab === 'pdf' && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {pdfs.length === 0 && <div className="p-4 text-muted">Δεν υπάρχουν ακόμη PDF.</div>}

              {pdfs.map((pdf) => (
                <div key={pdf.key} className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail (smaller, consistent) */}
                    <div className="shrink-0">
                      <PdfThumb storageKey={pdf.key} getUrl={getUrl} width={50} />
                    </div>

                    {/* Title + date */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-all">{prettyName(pdf.name || pdf.key)}</div>
                      <div className="text-xs text-muted">
                        {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : ''}
                      </div>
                    </div>

                    {/* Right-aligned actions */}
                    <div className="actions ml-auto">
                      <button className="btn" onClick={() => openPdf(pdf.key)}>Άνοιγμα</button>
                      <button className="btn btn-gold" onClick={() => downloadKey(pdf.key, pdf.name)}>Λήψη</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Safely read text from a Response without throwing on binary/empty bodies */
async function safeText(res: Response) {
  try { return await res.text(); } catch { return `HTTP ${res.status}`; }
}
