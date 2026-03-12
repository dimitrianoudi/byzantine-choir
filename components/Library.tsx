'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import PdfThumb from './PdfThumb';
import { USER_SETTINGS_EVENT, getUserSettings, type UserSettings } from '@/lib/userSettings';
import { buildAkolouthiesAudioPathFromKey } from '@/lib/akolouthies';
import { buildMaterialAudioPathFromKey, buildMaterialPdfPathFromKey } from '@/lib/material';
import { buildMaterialUrlForPrefix, getMaterialPrefixFromUrl } from '@/lib/materialNavigation';
import * as Sentry from '@sentry/nextjs';

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

function getPrefixFromUrl() {
  if (typeof window === 'undefined') return '';
  return getMaterialPrefixFromUrl(window.location.pathname, window.location.search);
}

function getSelectedKeyFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URL(window.location.href).searchParams.get('key') || '';
}

function getShareBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
}

function getParentPrefix(key: string) {
  const parts = key.split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  return `${parts.slice(0, -1).join('/')}/`;
}

function formatItemFolder(key: string) {
  const parent = getParentPrefix(key).replace(/\/$/, '');
  return parent || 'Αρχή';
}

const LIBRARY_LAST_PREFIX_KEY = 'bcp:library:last-prefix';

export default function Library({
  role,
  prefix: initialPrefix = '',
  query = '',
}: {
  role: Role;
  prefix?: string;
  query?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState<string>(initialPrefix);
  const searchQuery = query.trim();
  const hasSearchQuery = searchQuery.length > 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAkolouthies = useMemo(() => prefix.startsWith('Ακολουθίες/'), [prefix]);

  const [activeTab, setActiveTab] = useState<'podcast' | 'pdf'>('podcast');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [presigned, setPresigned] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const [autoplay, setAutoplay] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [preferredPlaybackRate, setPreferredPlaybackRate] = useState(1);
  const [preferredDefaultTab, setPreferredDefaultTab] = useState<'podcast' | 'pdf'>('podcast');
  const [rememberLastFolder, setRememberLastFolder] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setPrefix(initialPrefix || '');
  }, [initialPrefix]);

  useEffect(() => {
    const onPopState = () => {
      setPrefix(getPrefixFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigatePrefix = (nextPrefix: string, mode: 'push' | 'replace' = 'push') => {
    if (mode === 'push' && nextPrefix !== prefix) {
      trackCount('library.navigate_folder');
    }
    setPrefix(nextPrefix);

    if (typeof window === 'undefined') return;

    const nextUrl = buildMaterialUrlForPrefix(nextPrefix);
    if (mode === 'replace') window.history.replaceState({}, '', nextUrl);
    else window.history.pushState({}, '', nextUrl);
  };

  useEffect(() => {
    const applySettings = (next: UserSettings) => {
      setAutoplay(next.defaultAutoplay);
      setPreferredPlaybackRate(next.playbackRate);
      setPreferredDefaultTab(next.defaultMaterialTab);
      setRememberLastFolder(next.rememberLastFolder);
    };

    const settings = getUserSettings();
    applySettings(settings);

    if (!initialPrefix && settings.rememberLastFolder && typeof window !== 'undefined') {
      const remembered = window.localStorage.getItem(LIBRARY_LAST_PREFIX_KEY) || '';
      if (remembered) navigatePrefix(remembered, 'replace');
    }

    const onSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail;
      applySettings(detail || getUserSettings());
    };
    window.addEventListener(USER_SETTINGS_EVENT, onSettingsChanged as EventListener);
    return () => window.removeEventListener(USER_SETTINGS_EVENT, onSettingsChanged as EventListener);
  }, [initialPrefix]);

  useEffect(() => {
    if (typeof window === 'undefined' || !rememberLastFolder) return;
    window.localStorage.setItem(LIBRARY_LAST_PREFIX_KEY, prefix);
  }, [prefix, rememberLastFolder]);

  useEffect(() => {
    if (hasSearchQuery) {
      setActiveTab('pdf');
      return;
    }
    if (isAkolouthies) {
      setActiveTab('podcast');
      return;
    }
    if (prefix.toLowerCase().includes('/pdfs/')) setActiveTab('pdf');
    if (prefix.toLowerCase().includes('/podcasts/')) setActiveTab('podcast');
    if (!prefix && !prefix.toLowerCase().includes('/pdfs/') && !prefix.toLowerCase().includes('/podcasts/')) {
      setActiveTab(preferredDefaultTab);
    }
  }, [prefix, isAkolouthies, preferredDefaultTab, hasSearchQuery]);

  const podcasts = useMemo(() => items.filter((i) => i.type === 'podcast'), [items]);
  const pdfs = useMemo(() => items.filter((i) => i.type === 'pdf'), [items]);

  const hasPodcasts = podcasts.length > 0;
  const hasPdfs = pdfs.length > 0;

  useEffect(() => {
    if (hasSearchQuery) {
      if (activeTab !== 'pdf') setActiveTab('pdf');
      return;
    }
    if (isAkolouthies) {
      if (activeTab !== 'podcast') setActiveTab('podcast');
      return;
    }
    if (activeTab === 'podcast' && !hasPodcasts && hasPdfs) setActiveTab('pdf');
    if (activeTab === 'pdf' && !hasPdfs && hasPodcasts) setActiveTab('podcast');
  }, [activeTab, hasPodcasts, hasPdfs, isAkolouthies, hasSearchQuery]);

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
      const t0 = performance.now();
      setLoading(true);
      setError(null);
      setActionMsg(null);
      setPlayingKey(null);
      setCurrentKey(null);
      setCurrentIndex(-1);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      setHighlightedKey(null);

      try {
        const params = new URLSearchParams();
        if (prefix) params.set('prefix', prefix);
        if (hasSearchQuery) {
          params.set('q', searchQuery);
          params.set('type', 'pdf');
        }

        const res = await fetch(`/api/files/list?${params.toString()}`);
        if (!res.ok) throw new Error(await safeText(res));
        const data = await res.json();
        setItems(data.items || []);
        setFolders(data.folders || []);
      } catch (e: any) {
        Sentry.captureException(e);
        trackCount('library.load.error');
        setError(e?.message || 'Σφάλμα φόρτωσης');
      } finally {
        trackDistribution('library.load.duration_ms', performance.now() - t0);
        setLoading(false);
      }
    };
    load();
  }, [prefix, hasSearchQuery, searchQuery]);

  useEffect(() => {
    const sharedKey = getSelectedKeyFromUrl();
    if (!sharedKey || !items.length) return;

    const found = items.find((item) => item.key === sharedKey);
    if (!found) return;

    setHighlightedKey(found.key);
    setTimeout(() => {
      itemRefs.current[found.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);

    const timeoutId = window.setTimeout(() => {
      setHighlightedKey((prev) => (prev === found.key ? null : prev));
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [items]);

  const getUrl = async (key: string) => {
    if (presigned[key]) return presigned[key];
    const t0 = performance.now();

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
      trackCount('library.presign.error');
      throw new Error(msg || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data?.url) throw new Error('Το presign δεν επέστρεψε URL.');

    setPresigned((prev) => ({ ...prev, [key]: data.url as string }));
    trackCount('library.presign.success');
    trackDistribution('library.presign.duration_ms', performance.now() - t0);
    return data.url as string;
  };

  const play = async (key: string, idx: number) => {
    setActionMsg(null);
    const audio = audioRef.current;
    if (!audio) {
      setActionMsg('Δεν βρέθηκε ο player ήχου');
      return;
    }

    try {
      const isCurrentTrackLoaded = currentKey === key && !!audio.src;

      if (isCurrentTrackLoaded) {
        setCurrentIndex(idx);
        if (!audio.paused) {
          audio.pause();
          setPlayingKey(null);
          trackCount('library.podcast.pause');
        } else {
          await audio.play();
          setPlayingKey(key);
          trackCount('library.podcast.resume');
        }
        return;
      }

      if (playingKey && playingKey !== key) {
        audio.pause();
      }

      const url = await getUrl(key);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      audio.src = url;
      audio.load();
      audio.playbackRate = preferredPlaybackRate;
      await audio.play();
      setPlayingKey(key);
      setCurrentKey(key);
      setCurrentIndex(idx);
      trackCount('library.podcast.play');
    } catch (err: any) {
      Sentry.captureException(err);
      trackCount('library.podcast.play_error');
      setActionMsg(err?.message || 'Σφάλμα αναπαραγωγής');
    }
  };

  const onAudioEnded = async (endedIdx: number) => {
    setPlayingKey(null);
    setPlayerCurrentTime(0);
    if (!autoplay) return;
    const nextIdx = endedIdx + 1;
    if (nextIdx < 0 || nextIdx >= podcasts.length) {
      setCurrentKey(null);
      setCurrentIndex(-1);
      return;
    }
    await play(podcasts[nextIdx].key, nextIdx);
  };

  const openPdf = async (key: string) => {
    setActionMsg(null);
    try {
      const cleanUrl = buildMaterialPdfPathFromKey(key);
      const url = cleanUrl || (await getUrl(key));
      window.open(url, '_blank', 'noopener,noreferrer');
      trackCount('library.pdf.open');
    } catch (err: any) {
      Sentry.captureException(err);
      trackCount('library.pdf.open_error');
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
      trackCount('library.file.download');
    } catch (err: any) {
      Sentry.captureException(err);
      trackCount('library.file.download_error');
      setActionMsg(err?.message || 'Σφάλμα λήψης αρχείου');
    }
  };

  const buildSharedItemUrl = (item: Item) => {
    const base = getShareBaseUrl();
    const akolouthiesAudioPath =
      item.type === 'podcast' ? buildAkolouthiesAudioPathFromKey(item.key) : null;
    if (akolouthiesAudioPath) {
      return new URL(akolouthiesAudioPath, `${base}/`).toString();
    }

    const audioPath = item.type === 'podcast' ? buildMaterialAudioPathFromKey(item.key) : null;
    if (audioPath) {
      return new URL(audioPath, `${base}/`).toString();
    }

    const pdfPath = item.type === 'pdf' ? buildMaterialPdfPathFromKey(item.key) : null;
    if (pdfPath) {
      return new URL(pdfPath, `${base}/`).toString();
    }

    const url = new URL('/material', `${base}/`);
    const itemPrefix = getParentPrefix(item.key);
    if (itemPrefix) url.searchParams.set('prefix', itemPrefix);
    url.searchParams.set('key', item.key);
    return url.toString();
  };

  const shareItem = async (item: Item) => {
    setActionMsg(null);
    const url = buildSharedItemUrl(item);
    const title = prettyName(item.name || item.key);

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        trackCount('library.share.native');
        setActionMsg('Ο σύνδεσμος κοινοποιήθηκε.');
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(url);
      trackCount('library.share.copy');
      setActionMsg('Ο σύνδεσμος αντιγράφηκε.');
    } catch {
      window.prompt('Αντιγράψτε τον σύνδεσμο:', url);
      trackCount('library.share.prompt');
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
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setPlayingKey(null);
        setCurrentKey(null);
        setCurrentIndex(-1);
      } else {
        const idx = podcasts.findIndex((p) => p.key === key);
        if (idx >= 0 && currentIndex >= idx) setCurrentIndex((v) => Math.max(-1, v - 1));
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
          it.key === fromKey ? { ...it, key: toKey, name: toKey.split('/').pop() || toKey } : it
        )
      );

      if (playingKey === fromKey) {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
        setPlayingKey(null);
        setCurrentKey(null);
        setCurrentIndex(-1);
      }
    } catch (e: any) {
      setActionMsg(e?.message || 'Σφάλμα μετονομασίας');
    }
  };

  const showPodcastTab = !hasSearchQuery && (hasPodcasts || isAkolouthies);
  const showPdfTab = hasPdfs && (!isAkolouthies || hasSearchQuery);
  const activeTrack = currentIndex >= 0 ? podcasts[currentIndex] : null;

  useEffect(() => {
    if (!activeTrack) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = preferredPlaybackRate;
  }, [activeTrack, preferredPlaybackRate]);

  const seekActiveTrack = (nextTime: number) => {
    if (!activeTrack) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = nextTime;
    setPlayerCurrentTime(nextTime);
  };

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

        {activeTab === 'podcast' && hasPodcasts && (
          <button
            className={clsx('btn btn-outline btn--toggle', autoplay && 'btn--autoplay-on')}
            type="button"
            aria-pressed={autoplay}
            onClick={() => setAutoplay((v) => !v)}
          >
            Non-stop
          </button>
        )}

        <div className="text-xs text-muted flex flex-wrap items-center gap-1">
          {breadcrumbs.map((c, idx) => (
            <span key={c.value} className="flex items-center gap-1">
              {idx > 0 && <span>/</span>}
              <button
                type="button"
                onClick={() => navigatePrefix(c.value)}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                className={clsx(c.value === prefix ? 'font-semibold text-blue' : 'hover:underline')}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      {loading && <div className="card p-6">Φόρτωση...</div>}
      {error && <div className="card p-6 text-red-400">{error}</div>}
      {actionMsg && <div className="card p-4 text-amber-600 text-sm">{actionMsg}</div>}

      {!loading && !error && hasSearchQuery && (
        <div className="card p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">Αποτελέσματα PDF για "{searchQuery}"</div>
            <div className="text-xs text-muted">
              Η αναζήτηση γίνεται σε όλα τα PDF του portal με βάση το όνομα και τη διαδρομή τους.
            </div>
          </div>
          <div className="text-sm text-muted">
            {pdfs.length} {pdfs.length === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}
          </div>
        </div>
      )}

      {!loading && !error && folders.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-sm font-semibold text-muted">Φάκελοι</div>
          <div className="flex flex-col gap-2">
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                className="btn btn-outline justify-between"
                onClick={() => navigatePrefix(f)}
              >
                <span>📁 {folderLabel(f)}</span>
                <span className="text-xs text-muted">Άνοιγμα</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !hasPodcasts && !hasPdfs && folders.length === 0 && !hasSearchQuery && (
        <div className="card p-6 text-muted">Δεν υπάρχουν αρχεία σε αυτόν τον φάκελο.</div>
      )}

      {!loading && !error && !hasPdfs && hasSearchQuery && (
        <div className="card p-6 text-muted">Δεν βρέθηκαν PDF για αυτήν την αναζήτηση.</div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'podcast' && hasPodcasts && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {podcasts.map((p, idx) => (
                <div
                  key={p.key}
                  className={clsx('py-4', highlightedKey === p.key && 'shared-highlight')}
                  ref={(el) => {
                    itemRefs.current[p.key] = el;
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-words">{prettyName(p.name || p.key)}</div>
                      <div className="text-xs text-muted">
                        {p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 sm:ml-auto flex-wrap">
                      <button className="btn" onClick={() => play(p.key, idx)}>
                        {playingKey === p.key ? 'Παύση' : 'Αναπαραγωγή'}
                      </button>
                      <button className="btn btn-gold" onClick={() => downloadKey(p.key, p.name)}>
                        Λήψη
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-outline"
                        aria-label="Κοινοποίηση"
                        title="Κοινοποίηση"
                        onClick={() => shareItem(p)}
                      >
                        <ShareIcon />
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

                  <div className={clsx(currentIndex === idx ? 'now-playing mt-3' : 'hidden')}>
                    <div className="now-playing-head">
                      <span className="now-playing-badge">Τώρα παίζει</span>
                      <span className="now-playing-title">{prettyName(p.name || p.key)}</span>
                    </div>
                    <div className="player-controls">
                      <button className="btn btn-sm btn-outline" type="button" onClick={() => play(p.key, idx)}>
                        {playingKey === p.key ? 'Παύση' : 'Αναπαραγωγή'}
                      </button>
                      <div className="player-seek-wrap">
                        <input
                          type="range"
                          min={0}
                          max={Math.max(playerDuration, 0)}
                          step={0.1}
                          value={Math.min(playerCurrentTime, playerDuration || 0)}
                          onChange={(e) => seekActiveTrack(Number(e.target.value))}
                          className="player-seek"
                          aria-label="Μετακίνηση αναπαραγωγής"
                        />
                        <div className="player-time">
                          <span>{formatTime(playerCurrentTime)}</span>
                          <span>{formatTime(playerDuration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(hasSearchQuery || !isAkolouthies) && activeTab === 'pdf' && hasPdfs && (
            <div className="card p-6 divide-y divide-[color:var(--border)]">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.key}
                  className={clsx('py-4', highlightedKey === pdf.key && 'shared-highlight')}
                  ref={(el) => {
                    itemRefs.current[pdf.key] = el;
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="shrink-0">
                      <PdfThumb storageKey={pdf.key} getUrl={getUrl} width={50} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-words">{prettyName(pdf.name || pdf.key)}</div>
                      <div className="text-xs text-muted">
                        {[
                          hasSearchQuery ? `Φάκελος: ${formatItemFolder(pdf.key)}` : '',
                          pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 sm:ml-auto flex-wrap">
                      <button className="btn" onClick={() => openPdf(pdf.key)}>
                        Άνοιγμα
                      </button>
                      <button className="btn btn-gold" onClick={() => downloadKey(pdf.key, pdf.name)}>
                        Λήψη
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-outline"
                        aria-label="Κοινοποίηση"
                        title="Κοινοποίηση"
                        onClick={() => shareItem(pdf)}
                      >
                        <ShareIcon />
                      </button>
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

      <audio
        ref={audioRef}
        className="sr-only"
        preload="auto"
        onPlay={() => {
          if (currentKey) setPlayingKey(currentKey);
        }}
        onPause={() => {
          setPlayingKey((v) => (v === currentKey ? null : v));
        }}
        onLoadedMetadata={(e) => setPlayerDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setPlayerDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setPlayerCurrentTime(e.currentTarget.currentTime || 0)}
        onEnded={() => {
          const endedIdx = currentIndex;
          if (audioRef.current) audioRef.current.currentTime = 0;
          void onAudioEnded(endedIdx);
        }}
      />

      <style jsx>{`
        .shared-highlight {
          border-radius: 12px;
          background: rgba(49, 91, 153, 0.08);
          box-shadow: 0 0 0 2px rgba(49, 91, 153, 0.14);
          transition: background 220ms ease, box-shadow 220ms ease;
          padding-left: 10px;
          padding-right: 10px;
        }

        .now-playing {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(215, 166, 74, 0.1), rgba(255, 255, 255, 0.95));
          padding: 10px 12px 12px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
        }

        .now-playing-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          min-width: 0;
        }

        .now-playing-badge {
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 4px 10px;
          white-space: nowrap;
        }

        .now-playing-title {
          font-size: 13px;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .player-seek-wrap {
          flex: 1;
          min-width: 0;
        }

        .player-seek {
          width: 100%;
          accent-color: var(--blue-600);
        }

        .player-time {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 640px) {
          .now-playing {
            border-radius: 12px;
            padding: 10px;
          }

          .now-playing-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .now-playing-title {
            white-space: normal;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
          }

          .player-controls {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 8a3 3 0 1 0-2.83-4H13a3 3 0 0 0 3 4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 14a3 3 0 1 0 2.83 4H9a3 3 0 0 0-3-4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 21a3 3 0 1 0-2.83-4H15a3 3 0 0 0 3 4Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.6 15.4l6.8 3.2M15.4 7.4L8.6 10.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

function trackCount(name: string) {
  try {
    Sentry.metrics.count(name, 1);
  } catch {}
}

function trackDistribution(name: string, value: number) {
  try {
    Sentry.metrics.distribution(name, Math.max(0, Math.round(value)));
  } catch {}
}