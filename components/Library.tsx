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
  const base = (raw || '').split('/').pop() || raw;
  return base.replace(/^\d{13}[-_]/, '');
}

function folderLabel(prefix: string): string {
  const trimmed = prefix.replace(/\/$/, '');
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || prefix;
}

export default function Library({ role, prefix: initialPrefix = '' }: { role: Role; prefix?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState<string>(initialPrefix);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAkolouthies = useMemo(() => prefix.startsWith('Ακολουθίες/'), [prefix]);

  const [activeTab, setActiveTab] = useState<'podcast' | 'pdf'>('podcast');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [presigned, setPresigned] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setPrefix(initialPrefix || '');
  }, [initialPrefix]);

  useEffect(() => {
    if (isAkolouthies) {
      setActiveTab('podcast');
      return;
    }
    if (prefix.toLowerCase().includes('/pdfs/')) setActiveTab('pdf');
    if (prefix.toLowerCase().includes('/podcasts/')) setActiveTab('podcast');
  }, [prefix, isAkolouthies]);

  const podcasts = useMemo(() => items.filter((i) => i.type === 'podcast'), [items]);
  const pdfs = useMemo(() => items.filter((i) => i.type === 'pdf'), [items]);

  const hasPodcasts = podcasts.length > 0;
  const hasPdfs = pdfs.length > 0;

  useEffect(() => {
    if (isAkolouthies) {
      if (activeTab !== 'podcast') setActiveTab('podcast');
      return;
    }
    if (activeTab === 'podcast' && !hasPodcasts && hasPdfs) setActiveTab('pdf');
    if (activeTab === 'pdf' && !hasPdfs && hasPodcasts) setActiveTab('podcast');
  }, [activeTab, hasPodcasts, hasPdfs, isAkolouthies]);

  const breadcrumbs = useMemo(() => {
    const segments = prefix.split('/').filter(Boolean);
    const crumbs: { label: string; value: string }[] = [{ label: 'Αρχή', value: '' }];
    let acc = '';
    for (const seg of segments) {
      acc += seg + '/';
      crumbs.push({ label: seg, value: acc });
    }
    return crumbs;
  }, [prefix]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setActionMsg(null);
      setPlayingKey(null);

      try {
        const res = await fetch(`/api/files/list?prefix=${encodeURIComponent(prefix)}`);
        if (!res.ok) throw new Error(await safeText(res));
        const data = await res.json();
        setItems(data.items || []);
        setFolders(data.folders || []);
      } catch (e: any) {
        setError(e?.message || 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [prefix]);

  useEffect(() => {
    if (activeTab !== 'podcast') return;
    if (!hasPodcasts) return;

    const audio = document.getElementById('audio-player') as HTMLAudioElement | null;
    if (!audio) return;

    const onEnded = () => setPlayingKey(null);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [activeTab, hasPodcasts]);

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
    const audio = document.getElementById('audio-player') as HTMLAudioElement | null;
    if (!audio) {
      setActionMsg('Δεν βρέθηκε ο player ήχου');
      return;
    }

    try {
      if (playingKey === key) {
        if (!audio.paused) {
          audio.pause();
          setPlayingKey(null);
        } else {
          await audio.play();
          setPlayingKey(key);
        }
        return;
      }
      const url = await getUrl(key);
      audio.src = url;
      await audio.play();
      setPlayingKey(key);
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

  const deleteKey = async (key: string) => {
    if (role !== 'admin') return;
    if (!confirm('Διαγραφή αρχείου;')) return;

    setActionMsg(null);
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setItems((prev) => prev.filter((i) => i.key !== key));

      if (playingKey === key) {
        const audio = document.getElementById('audio-player') as HTMLAudioElement | null;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setPlayingKey(null);
      }
    } catch (err: any) {
      setActionMsg(err?.message || 'Σφάλμα διαγραφής');
    }
  };

  const renameKey = async (fromKey: string, currentName: string) => {
    if (role !== 'admin') return;

    const suggested = prettyName(currentName || fromKey);
    const newName = prompt('Νέο όνομα αρχείου (με επέκταση):', suggested);
    if (!newName) return;

    setActionMsg(null);
    try {
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromKey, newName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const toKey = String(json.toKey || '');
      if (!toKey) throw new Error('Rename failed');

      setItems((prev) =>
        prev.map((it) =>
          it.key === fromKey
            ? { ...it, key: toKey, name: toKey.split('/').pop() || toKey }
            : it
        )
      );

      if (playingKey === fromKey) {
        const audio = document.getElementById('audio-player') as HTMLAudioElement | null;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setPlayingKey(null);
      }
    } catch (e: any) {
      setActionMsg(e?.message || 'Σφάλμα μετονομασίας');
    }
  };

  const showPodcastTab = hasPodcasts || isAkolouthies;
  const showPdfTab = !isAkolouthies && hasPdfs;

  return (
    <div className="space-y-6">
      <div className="toolbar">
        {showPodcastTab && (
          <button
            className={clsx('btn btn-outline', activeTab === 'podcast' && 'btn--selected')}
            onClick={() => setActiveTab('podcast')}
          >
            Podcasts
          </button>
        )}

        {showPdfTab && (
          <button
            className={clsx('btn btn-outline', activeTab === 'pdf' && 'btn--selected')}
            onClick={() => setActiveTab('pdf')}
          >
            PDF
          </button>
        )}

        <div className="text-xs text-muted flex flex-wrap items-center gap-1">
          {breadcrumbs.map((c, idx) => (
            <span key={c.value} className="flex items-center gap-1">
              {idx > 0 && <span>/</span>}
              <button
                type="button"
                onClick={() => setPrefix(c.value)}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                className={clsx(c.value === prefix ? 'font-semibold text-blue' : 'hover:underline')}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>

        <div className="header-spacer" />
      </div>

      {loading && <div className="card p-6">Φόρτωση...</div>}
      {error && <div className="card p-6 text-red-400">{error}</div>}
      {actionMsg && <div className="card p-4 text-amber-600 text-sm">{actionMsg}</div>}

      {!loading && !error && folders.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-sm font-semibold text-muted">Φάκελοι</div>
          <div className="flex flex-col gap-2">
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                className="btn btn-outline justify-between"
                onClick={() => setPrefix(f)}
              >
                <span>📁 {folderLabel(f)}</span>
                <span className="text-xs text-muted">Άνοιγμα</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !hasPodcasts && !hasPdfs && folders.length === 0 && (
        <div className="card p-6 text-muted">Δεν υπάρχουν αρχεία σε αυτόν τον φάκελο.</div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'podcast' && hasPodcasts && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {podcasts.map((p) => (
                <div key={p.key} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-all">{prettyName(p.name || p.key)}</div>
                      <div className="text-xs text-muted">
                        {p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 sm:ml-auto flex-wrap">
                      <button className="btn" onClick={() => play(p.key)}>
                        {playingKey === p.key ? 'Παύση' : 'Αναπαραγωγή'}
                      </button>
                      <button className="btn btn-gold" onClick={() => downloadKey(p.key, p.name)}>
                        Λήψη
                      </button>
                      {role === 'admin' && (
                        <>
                          <button className="btn btn-outline" onClick={() => renameKey(p.key, p.name)}>
                            Μετονομασία
                          </button>
                          <button className="btn btn-outline text-red" onClick={() => deleteKey(p.key)}>
                            Διαγραφή
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t border-subtle bg-white p-3">
                <audio id="audio-player" className="w-full h-10 block" controls preload="none" />
              </div>
            </div>
          )}

          {!isAkolouthies && activeTab === 'pdf' && hasPdfs && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {pdfs.map((pdf) => (
                <div key={pdf.key} className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      <PdfThumb storageKey={pdf.key} getUrl={getUrl} width={50} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-all">{prettyName(pdf.name || pdf.key)}</div>
                      <div className="text-xs text-muted">
                        {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : ''}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 ml-auto flex-wrap">
                      <button className="btn" onClick={() => openPdf(pdf.key)}>Άνοιγμα</button>
                      <button className="btn btn-gold" onClick={() => downloadKey(pdf.key, pdf.name)}>Λήψη</button>
                      {role === 'admin' && (
                        <>
                          <button className="btn btn-outline" onClick={() => renameKey(pdf.key, pdf.name)}>
                            Μετονομασία
                          </button>
                          <button className="btn btn-outline text-red" onClick={() => deleteKey(pdf.key)}>
                            Διαγραφή
                          </button>
                        </>
                      )}
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

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}