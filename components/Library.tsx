'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function Library({ role }: { role: Role }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'podcast' | 'pdf'>('podcast');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [presigned, setPresigned] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      // Try to surface clear error message
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
    if (!data?.url) {
      throw new Error('Το presign δεν επέστρεψε URL.');
    }

    setPresigned((prev) => ({ ...prev, [key]: data.url as string }));
    return data.url as string;
  };

  const play = async (key: string) => {
    setActionMsg(null);
    try {
      const url = await getUrl(key);
      setPlayingKey(key);
      if (audioRef.current) {
        audioRef.current.src = url;
        try { await audioRef.current.play(); } catch {}
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
      {actionMsg && <div className="card p-4 text-amber-300 text-sm">{actionMsg}</div>}

      {!loading && !error && (
        <>
          {activeTab === 'podcast' && (
            <div className="card p-0 overflow-hidden">
              {/* Scrollable list area */}
              <div className="divide-y divide-[color:var(--border)] p-6 max-h-[60vh] overflow-auto">
                {podcasts.length === 0 && (
                  <div className="p-4 text-muted">Δεν υπάρχουν ακόμη podcasts.</div>
                )}
                {podcasts.map((p) => (
                  <div key={p.key} className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium break-all truncate">{p.name}</div>
                        <div className="text-xs text-muted">
                          {p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn btn-sm" onClick={() => play(p.key)}>
                          {playingKey === p.key ? 'Παίζει...' : 'Αναπαραγωγή'}
                        </button>
                        <button
                          className="btn btn-gold btn-sm"
                          onClick={() => downloadKey(p.key, p.name)}
                        >
                          Λήψη
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky player bar */}
              <div className="sticky bottom-0 w-full border-t border-subtle bg-white/90 backdrop-blur p-3 z-10">
                <audio ref={audioRef} id="audio-player" className="w-full" controls />
              </div>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="grid gap-6 sm:grid-cols-2">
              {pdfs.length === 0 && (
                <div className="card p-6 text-muted">Δεν υπάρχουν ακόμη PDF.</div>
              )}
              {pdfs.map((pdf) => (
                <div key={pdf.key} className="card p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <PdfThumb storageKey={pdf.key} getUrl={getUrl} width={200} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-all">{pdf.name}</div>
                      <div className="text-xs text-muted">
                        {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  <div className="actions mt-auto">
                    <button className="btn" onClick={() => openPdf(pdf.key)}>
                      Άνοιγμα
                    </button>
                    <button
                      className="btn btn-gold"
                      onClick={() => downloadKey(pdf.key, pdf.name)}
                    >
                      Λήψη
                    </button>
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
  try {
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}
