'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import GalleryUploader from '@/components/GalleryUploader';

type Role = 'member' | 'admin';

type GalleryItem = {
  id: string;
  publicId: string;
  type: 'image' | 'video';
  src: string;
  thumb: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number | null;
};

function folderLabel(path: string) {
  const parts = path.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || path;
}

function normalizePrefix(p: string) {
  if (!p) return '';
  return p.endsWith('/') ? p : `${p}/`;
}

export default function Gallery({ role }: { role: Role }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const [busyDelete, setBusyDelete] = useState(false);

  const breadcrumbs = useMemo(() => {
    const segs = prefix.split('/').filter(Boolean);
    const crumbs: { label: string; value: string }[] = [{ label: 'Αρχή', value: '' }];
    let acc = '';
    for (const s of segs) {
      acc += s + '/';
      crumbs.push({ label: s, value: acc });
    }
    return crumbs;
  }, [prefix]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/gallery?prefix=${encodeURIComponent(prefix)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Load failed');

      setItems(Array.isArray(json.items) ? json.items : []);
      setFolders(Array.isArray(json.folders) ? json.folders : []);
    } catch (e: any) {
      setErr(e?.message || 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openAt = (i: number) => setLightbox({ open: true, index: i });
  const close = () => setLightbox({ open: false, index: 0 });
  const prev = () =>
    setLightbox((v) => ({ ...v, index: (v.index + items.length - 1) % items.length }));
  const next = () =>
    setLightbox((v) => ({ ...v, index: (v.index + 1) % items.length }));

  const deleteItem = async (it: GalleryItem) => {
    if (role !== 'admin') return;
    if (busyDelete) return;
    if (!confirm('Διαγραφή από το gallery;')) return;

    setBusyDelete(true);
    setErr(null);

    try {
      const res = await fetch('/api/gallery/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.publicId || it.id, resourceType: it.type }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');

      const wasLightboxOpen = lightbox.open;
      const removedIndex = lightbox.index;

      await loadItems();

      if (wasLightboxOpen) {
        setLightbox((v) => {
          const newLen = Math.max(0, items.length - 1);
          if (newLen === 0) return { open: false, index: 0 };
          const nextIndex = Math.min(removedIndex, newLen - 1);
          return { open: true, index: nextIndex };
        });
      }
    } catch (e: any) {
      setErr(e?.message || 'Σφάλμα διαγραφής');
    } finally {
      setBusyDelete(false);
    }
  };

  const [newFolder, setNewFolder] = useState('');

  const createFolder = () => {
    const name = newFolder.trim();
    if (!name) return;
    setPrefix((p) => normalizePrefix(p + name));
    setNewFolder('');
  };

  return (
    <div className="space-y-6">
      <div className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Στιγμιότυπα
        </h1>
        <div className="header-spacer" />

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
      </div>

      {role === 'admin' && (
        <section className="space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm text-muted">
              Τρέχων φάκελος: <span className="text-blue">{prefix || 'Αρχή'}</span>
            </div>

            <div className="flex gap-2">
              <input
                className="input"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Νέος φάκελος (π.χ. 2025/Πάσχα)"
                style={{ maxWidth: 340 }}
              />
              <button
                className="btn btn-outline"
                type="button"
                onClick={createFolder}
                disabled={!newFolder.trim()}
                title="Σημείωση: ο φάκελος θα εμφανιστεί αφού ανεβεί τουλάχιστον 1 αρχείο"
              >
                Δημιουργία
              </button>
            </div>
          </div>

          <GalleryUploader folder={prefix} onUploaded={loadItems} />
        </section>
      )}

      {loading && <div className="card p-6">Φόρτωση…</div>}
      {err && <div className="card p-6 text-red">{err}</div>}

      {!loading && !err && folders.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-sm font-semibold text-muted">Φάκελοι</div>
          <div className="flex flex-col gap-2">
            {folders.map((f) => (
              <button
                key={prefix + f}
                type="button"
                className="btn btn-outline justify-between"
                onClick={() => {
                  const base = prefix.replace(/\/$/, '');
                  const next = base ? `${base}/${f}` : f;
                  setPrefix(normalizePrefix(next));
                }}
              >
                <span>📁 {folderLabel(f)}</span>
                <span className="text-xs text-muted">Άνοιγμα</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !err && items.length === 0 && (folders.length > 0 || prefix) && (
        <div className="card p-6 text-muted text-center">
          Δεν βρέθηκαν αρχεία σε αυτόν τον φάκελο. Για έλεγχο API: <code className="text-xs">/api/gallery?prefix={encodeURIComponent(prefix)}&_debug=1</code>
        </div>
      )}

      {!loading && !err && (
        <div className="masonry">
          {items.map((it, i) => (
            <div key={it.id} className="masonry-wrap">
              <button className="masonry-item" onClick={() => openAt(i)} aria-label="Προβολή">
                {it.type === 'image' ? (
                  <img src={it.thumb} alt="" className="thumb" loading="lazy" />
                ) : (
                  <div className="thumb video-thumb">
                    <div className="video-badge">▶</div>
                  </div>
                )}
              </button>

              {role === 'admin' && (
                <button
                  type="button"
                  className="del-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteItem(it);
                  }}
                  disabled={busyDelete}
                  aria-label="Διαγραφή"
                  title="Διαγραφή"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox.open && items[lightbox.index] && (
        <div className="overlay" onClick={close} role="dialog" aria-modal="true">
          <div className="lb-content" onClick={(e) => e.stopPropagation()}>
            <button className="lb-x" onClick={close} aria-label="Κλείσιμο">
              ✕
            </button>
            <button className="lb-prev" onClick={prev} aria-label="Προηγούμενο">
              ‹
            </button>
            <button className="lb-next" onClick={next} aria-label="Επόμενο">
              ›
            </button>

            {role === 'admin' && (
              <button
                className="lb-del"
                onClick={() => deleteItem(items[lightbox.index])}
                disabled={busyDelete}
                aria-label="Διαγραφή"
              >
                Διαγραφή
              </button>
            )}

            {items[lightbox.index].type === 'image' ? (
              <img src={items[lightbox.index].src} alt="" className="lb-media" />
            ) : (
              <video className="lb-media" src={items[lightbox.index].src} controls playsInline />
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .masonry {
          column-count: 1;
          column-gap: 1rem;
        }
        @media (min-width: 640px) {
          .masonry {
            column-count: 2;
          }
        }
        @media (min-width: 1024px) {
          .masonry {
            column-count: 3;
          }
        }

        .masonry-wrap {
          position: relative;
          break-inside: avoid;
          margin: 0 0 1rem;
        }

        .masonry-item {
          display: block;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: zoom-in;
        }

        .thumb {
          display: block;
          width: 100%;
          border-radius: 12px;
          background: #f3f4f6;
          object-fit: cover;
        }

        .video-thumb {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #111;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #fff;
        }

        .video-badge {
          position: absolute;
          bottom: 10px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 9999px;
          padding: 6px 10px;
          font-weight: 700;
        }

        .del-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .del-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(3px);
          z-index: 2000;
          display: grid;
          place-items: center;
          padding: 16px;
        }
        .lb-content {
          position: relative;
          max-width: min(92vw, 1200px);
          max-height: 86vh;
          margin: auto;
        }
        .lb-media {
          display: block;
          max-width: 100%;
          max-height: 86vh;
          border-radius: 12px;
          background: #000;
        }
        .lb-x,
        .lb-prev,
        .lb-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          border: 0;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          cursor: pointer;
        }
        .lb-x {
          top: -48px;
          right: 0;
          transform: none;
        }
        .lb-prev {
          left: -52px;
        }
        .lb-next {
          right: -52px;
        }

        .lb-del {
          position: absolute;
          top: -48px;
          left: 0;
          height: 40px;
          padding: 0 14px;
          border-radius: 9999px;
          border: 0;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          cursor: pointer;
        }
        .lb-del:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .lb-prev {
            left: 8px;
          }
          .lb-next {
            right: 8px;
          }
          .lb-x {
            top: -48px;
            right: 8px;
          }
          .lb-del {
            top: -48px;
            left: 8px;
          }
        }
      `}</style>
    </div>
  );
}
