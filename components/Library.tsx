'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

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
      <div className="flex items-center gap-2">
        <button
          className={clsx('btn', activeTab === 'podcast' && 'border-white/40')}
          onClick={() => setActiveTab('podcast')}
        >
          Podcasts
        </button>
        <button
          className={clsx('btn', activeTab === 'pdf' && 'border-white/40')}
          onClick={() => setActiveTab('pdf')}
        >
          PDF Βιβλία
        </button>
        <div className="ml-auto text-sm text-white/60">{role === 'admin' ? 'Διαχειριστής' : 'Μέλος'}</div>
      </div>

      {loading && <div className="card p-6">Φόρτωση...</div>}
      {error && <div className="card p-6 text-red-400">{error}</div>}
      {actionMsg && <div className="card p-4 text-amber-300 text-sm">{actionMsg}</div>}

      {!loading && !error && (
        <>
          {activeTab === 'podcast' && (
            <div className="card p-4 divide-y divide-white/10">
              {podcasts.length === 0 && <div className="p-4 text-white/60">Δεν υπάρχουν ακόμη podcasts.</div>}
              {podcasts.map((p) => (
                <div key={p.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <div className="font-medium break-all">{p.name}</div>
                    <div className="text-xs text-white/50">
                      {p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}
                    </div>
                  </div>
                  <button className="btn" onClick={() => play(p.key)}>
                    {playingKey === p.key ? 'Παίζει...' : 'Αναπαραγωγή'}
                  </button>
                  <button className="btn" onClick={() => downloadKey(p.key, p.name)}>
                    Λήψη
                  </button>
                </div>
              ))}
              <audio id="audio-player" className="w-full mt-3" controls />
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {pdfs.length === 0 && <div className="card p-4 text-white/60">Δεν υπάρχουν ακόμη PDF.</div>}
              {pdfs.map((pdf) => (
                <div key={pdf.key} className="card p-4 flex flex-col gap-2">
                  <div className="font-medium break-all">{pdf.name}</div>
                  <div className="text-xs text-white/50">
                    {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : ''}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button className="btn" onClick={() => openPdf(pdf.key)}>
                      Άνοιγμα
                    </button>
                    <button className="btn" onClick={() => downloadKey(pdf.key, pdf.name)}>
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
