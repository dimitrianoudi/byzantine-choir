'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function joinFolder(prefix: string, name: string) {
  const p = (prefix || '').replace(/^\/+|\/+$/g, '');
  const n = (name || '').replace(/^\/+|\/+$/g, '');
  if (!p) return n ? `${n}/` : '';
  if (!n) return `${p}/`;
  return `${p}/${n}/`;
}

function publicIdDir(publicId: string) {
  const parts = publicId.split('/');
  parts.pop();
  return parts.join('/');
}

function publicIdBase(publicId: string) {
  const parts = publicId.split('/');
  return parts[parts.length - 1] || publicId;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function Gallery({ role }: { role: Role }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [busyDelete, setBusyDelete] = useState(false);

  const [newFolder, setNewFolder] = useState('');
  const [moveMode, setMoveMode] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>('');
  const [busyMove, setBusyMove] = useState(false);

  const [autoPlay, setAutoPlay] = useState(false);
  const autoRef = useRef<number | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{ startDist: number; startScale: number; startX: number; startY: number; startCenterX: number; startCenterY: number } | null>(null);

  const [zoom, setZoom] = useState<{ scale: number; x: number; y: number; active: boolean }>({
    scale: 1,
    x: 0,
    y: 0,
    active: false,
  });

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

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

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0, active: false });
    pointersRef.current.clear();
    gestureRef.current = null;
  }, []);

  const applyTransform = useCallback((next: { scale: number; x: number; y: number; active: boolean }) => {
    const s = clamp(next.scale, 1, 4);
    const nx = next.active ? next.x : 0;
    const ny = next.active ? next.y : 0;
    setZoom({ scale: s, x: nx, y: ny, active: next.active });
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/gallery?prefix=${encodeURIComponent(prefix)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Load failed');
      setItems(json.items || []);
      setFolders(json.folders || []);
    } catch (e: any) {
      setErr(e?.message || 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openAt = (i: number) => {
    resetZoom();
    setLightbox({ open: true, index: i });
    setTimeout(() => {
      const el = stageRef.current;
      if (el) el.focus();
    }, 0);
  };

  const close = () => {
    setAutoPlay(false);
    resetZoom();
    setLightbox({ open: false, index: 0 });
  };

  const prev = useCallback(() => {
    resetZoom();
    setLightbox((v) => ({ ...v, index: (v.index + items.length - 1) % items.length }));
  }, [items.length, resetZoom]);

  const next = useCallback(() => {
    resetZoom();
    setLightbox((v) => ({ ...v, index: (v.index + 1) % items.length }));
  }, [items.length, resetZoom]);

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox.open, prev, next]);

  useEffect(() => {
    if (!lightbox.open || !autoPlay || items.length < 2) return;
    if (autoRef.current) window.clearInterval(autoRef.current);
    autoRef.current = window.setInterval(() => next(), 4500);
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
      autoRef.current = null;
    };
  }, [lightbox.open, autoPlay, items.length, next]);

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (!lightbox.open) return;
    const el = stageRef.current;
    if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        startDist: 0,
        startScale: zoom.scale,
        startX: zoom.x,
        startY: zoom.y,
        startCenterX: pts[0].x,
        startCenterY: pts[0].y,
      };
    } else if (pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      gestureRef.current = {
        startDist: dist,
        startScale: zoom.scale,
        startX: zoom.x,
        startY: zoom.y,
        startCenterX: cx,
        startCenterY: cy,
      };
    }
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!lightbox.open) return;

    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const g = gestureRef.current;
    if (!g) return;

    const pts = Array.from(pointersRef.current.values());
    if (pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;

      const ratio = g.startDist ? dist / g.startDist : 1;
      const ns = clamp(g.startScale * ratio, 1, 4);

      const ddx = cx - g.startCenterX;
      const ddy = cy - g.startCenterY;

      applyTransform({ scale: ns, x: g.startX + ddx, y: g.startY + ddy, active: ns > 1.01 });
      return;
    }

    if (pts.length === 1) {
      const p = pts[0];
      const ddx = p.x - g.startCenterX;
      const ddy = p.y - g.startCenterY;

      if (zoom.scale > 1.01 || zoom.active) {
        applyTransform({ scale: zoom.scale, x: g.startX + ddx, y: g.startY + ddy, active: true });
      } else {
        if (!swipeRef.current) swipeRef.current = { x: p.x, y: p.y, t: Date.now() };
      }
    }
  };

  const onStagePointerUp = (e: React.PointerEvent) => {
    if (!lightbox.open) return;

    pointersRef.current.delete(e.pointerId);
    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 0) {
      const s = swipeRef.current;
      swipeRef.current = null;
      if (!zoom.active && s) {
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        const dt = Date.now() - s.t;
        if (dt < 650 && Math.abs(dx) > 50 && Math.abs(dy) < 60) {
          if (dx < 0) next();
          else prev();
        }
      }
      gestureRef.current = null;
      return;
    }

    if (pts.length === 1) {
      const p = pts[0];
      gestureRef.current = {
        startDist: 0,
        startScale: zoom.scale,
        startX: zoom.x,
        startY: zoom.y,
        startCenterX: p.x,
        startCenterY: p.y,
      };
      return;
    }

    const a = pts[0];
    const b = pts[1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    gestureRef.current = {
      startDist: dist,
      startScale: zoom.scale,
      startX: zoom.x,
      startY: zoom.y,
      startCenterX: cx,
      startCenterY: cy,
    };
  };

  const toggleZoomClick = () => {
    if (items[lightbox.index]?.type === 'video') return;
    if (!zoom.active) {
      applyTransform({ scale: 2, x: 0, y: 0, active: true });
    } else {
      resetZoom();
    }
  };

  const del = async (it: GalleryItem) => {
    if (role !== 'admin') return;
    if (!confirm('Διαγραφή από το gallery;')) return;

    setBusyDelete(true);
    try {
      const res = await fetch('/api/gallery/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.publicId, resourceType: it.type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');

      setItems((prev) => prev.filter((x) => x.publicId !== it.publicId));

      setLightbox((v) => {
        if (!v.open) return v;
        const nextLen = Math.max(0, items.length - 1);
        if (nextLen === 0) return { open: false, index: 0 };
        return { open: true, index: clamp(v.index, 0, nextLen - 1) };
      });

      resetZoom();
    } catch (e: any) {
      alert(e?.message || 'Σφάλμα διαγραφής');
    } finally {
      setBusyDelete(false);
    }
  };

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/gallery/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prefix }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Create folder failed');
      setNewFolder('');
      await loadItems();
    } catch (e: any) {
      alert(e?.message || 'Σφάλμα δημιουργίας φακέλου');
    }
  };

  const moveItem = async (it: GalleryItem, targetFolder: string) => {
    const toFolder = (targetFolder || '').replace(/\/?$/, '');
    if (!toFolder) return;
    if (!confirm(`Μεταφορά στο: ${toFolder}/ ;`)) return;

    setBusyMove(true);
    try {
      const res = await fetch('/api/gallery/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPublicId: it.publicId,
          toFolder,
          resourceType: it.type,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Move failed');
      await loadItems();
    } catch (e: any) {
      alert(e?.message || 'Σφάλμα μεταφοράς');
    } finally {
      setBusyMove(false);
    }
  };

  const onThumbDragStart = (e: React.DragEvent, it: GalleryItem) => {
    if (role !== 'admin') return;
    e.dataTransfer.setData('application/x-gallery-publicid', it.publicId);
    e.dataTransfer.setData('application/x-gallery-type', it.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onFolderDrop = async (e: React.DragEvent, folder: string) => {
    if (role !== 'admin') return;
    e.preventDefault();
    const fromPublicId = e.dataTransfer.getData('application/x-gallery-publicid');
    const resourceType = e.dataTransfer.getData('application/x-gallery-type') as 'image' | 'video';
    if (!fromPublicId) return;

    const it = items.find((x) => x.publicId === fromPublicId);
    const type = (resourceType === 'image' || resourceType === 'video') ? resourceType : it?.type;
    if (!type) return;

    const temp: GalleryItem = it || {
      id: fromPublicId,
      publicId: fromPublicId,
      type,
      src: '',
      thumb: '',
    };

    await moveItem(temp, folder.replace(/\/$/, ''));
  };

  const onFolderDragOver = (e: React.DragEvent) => {
    if (role !== 'admin') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const visibleFolders = useMemo(() => {
    const f = folders.map((x) => x.replace(/\/?$/, '/'));
    const uniq = Array.from(new Set(f));
    return uniq.sort((a, b) => a.localeCompare(b, 'el'));
  }, [folders]);

  const currentFolderLabel = useMemo(() => {
    if (!prefix) return 'Αρχή';
    const trimmed = prefix.replace(/\/$/, '');
    const parts = trimmed.split('/');
    return parts[parts.length - 1] || trimmed;
  }, [prefix]);

  return (
    <div className="space-y-6">
      <div className="toolbar gallery-toolbar">
        <div className="gallery-title">
          <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
            Στιγμιότυπα
          </h1>
          <div className="text-xs text-muted gallery-subtitle">
            <span className="text-muted">Φάκελος:</span> <span className="text-blue">{currentFolderLabel}</span>
          </div>
        </div>

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
          <div className="card p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-muted">
                Τρέχων φάκελος: <span className="text-blue">{prefix || 'Αρχή'}</span>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={moveMode} onChange={(e) => setMoveMode(e.target.checked)} />
                  Μεταφορά
                </label>

                {moveMode && (
                  <select className="input" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} style={{ maxWidth: 320 }}>
                    <option value="">Επιλογή φακέλου…</option>
                    {visibleFolders.map((f) => (
                      <option key={f} value={f.replace(/\/$/, '')}>{f}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Νέος φάκελος (π.χ. 2025/Πάσχα)"
                  style={{ maxWidth: 340 }}
                />
                <button className="btn btn-outline" type="button" onClick={createFolder} disabled={!newFolder.trim()}>
                  Δημιουργία
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  className={clsx('btn btn-outline', autoPlay && 'btn--selected')}
                  type="button"
                  onClick={() => setAutoPlay((v) => !v)}
                  disabled={!lightbox.open || items.length < 2}
                  title="Auto-play μέσα στο lightbox"
                >
                  Auto-play
                </button>
              </div>
            </div>
          </div>

          <GalleryUploader folder={prefix} onUploaded={loadItems} />
        </section>
      )}

      {loading && <div className="card p-6">Φόρτωση…</div>}
      {err && <div className="card p-6 text-red">{err}</div>}

      {!loading && !err && visibleFolders.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-sm font-semibold text-muted">Φάκελοι</div>
          <div className="flex flex-col gap-2">
            {visibleFolders.map((f) => (
              <button
                key={f}
                type="button"
                className="btn btn-outline justify-between folder-drop"
                onClick={() => setPrefix(f)}
                onDrop={(e) => onFolderDrop(e, f)}
                onDragOver={onFolderDragOver}
              >
                <span>📁 {folderLabel(f)}</span>
                <span className="text-xs text-muted">{moveMode ? 'Drop για μεταφορά' : 'Άνοιγμα'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !err && (
        <div className="masonry">
          {items.map((it, i) => (
            <div key={it.publicId} className="masonry-wrap">
              <button
                className="masonry-item"
                onClick={() => openAt(i)}
                aria-label="Προβολή"
                draggable={role === 'admin' && moveMode}
                onDragStart={(e) => onThumbDragStart(e, it)}
              >
                {it.type === 'image' ? (
                  <img src={it.thumb} alt="" className="thumb" loading="lazy" />
                ) : (
                  <div className="thumb video-thumb">
                    <div className="video-badge">▶</div>
                  </div>
                )}
              </button>

              {role === 'admin' && (
                <div className="thumb-actions">
                  {moveMode && (
                    <button
                      type="button"
                      className="chip"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!moveTarget) {
                          alert('Διάλεξε φάκελο μεταφοράς.');
                          return;
                        }
                        moveItem(it, moveTarget);
                      }}
                      disabled={busyMove}
                      title="Μεταφορά στον επιλεγμένο φάκελο"
                    >
                      ⇢
                    </button>
                  )}

                  <button
                    type="button"
                    className="chip danger"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); del(it); }}
                    disabled={busyDelete}
                    aria-label="Διαγραφή"
                    title="Διαγραφή"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox.open && items[lightbox.index] && (
        <div className="overlay lb-fade" onClick={close} role="dialog" aria-modal="true">
          <div
            className={clsx('lb-content lb-pop', zoom.active && 'lb-zooming')}
            onClick={(e) => e.stopPropagation()}
            ref={stageRef}
            tabIndex={-1}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
            onDoubleClick={toggleZoomClick}
          >
            <button className="lb-x" onClick={close} aria-label="Κλείσιμο">✕</button>
            <button className="lb-prev" onClick={prev} aria-label="Προηγούμενο">‹</button>
            <button className="lb-next" onClick={next} aria-label="Επόμενο">›</button>

            <div className="lb-top">
              <div className="lb-title text-xs text-muted">
                {items[lightbox.index].publicId}
              </div>

              <div className="lb-top-actions">
                <button className={clsx('btn btn-outline btn-sm', autoPlay && 'btn--selected')} type="button" onClick={() => setAutoPlay((v) => !v)} disabled={items.length < 2}>
                  Auto
                </button>
                <button className="btn btn-outline btn-sm" type="button" onClick={resetZoom} disabled={!zoom.active}>
                  Reset
                </button>
                {role === 'admin' && (
                  <button className="btn btn-outline btn-sm" type="button" onClick={() => del(items[lightbox.index])} disabled={busyDelete}>
                    Διαγραφή
                  </button>
                )}
              </div>
            </div>

            <div className="lb-stage">
              {items[lightbox.index].type === 'image' ? (
                <img
                  ref={(el) => { mediaRef.current = el; }}
                  src={items[lightbox.index].src}
                  alt=""
                  className="lb-media"
                  style={{
                    transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
                    transition: zoom.active ? 'none' : 'transform 220ms ease',
                    cursor: zoom.active ? 'grab' : 'zoom-in',
                  }}
                  draggable={false}
                />
              ) : (
                <video
                  ref={(el) => { mediaRef.current = el; }}
                  className="lb-media"
                  src={items[lightbox.index].src}
                  controls
                  playsInline
                />
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery-toolbar {
          align-items: flex-start;
        }

        .gallery-title {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .gallery-subtitle {
          max-width: 48ch;
          white-space: normal;
          line-height: 1.2;
        }

        .masonry {
          column-count: 1;
          column-gap: 1rem;
        }
        @media (min-width: 640px) { .masonry { column-count: 2; } }
        @media (min-width: 1024px) { .masonry { column-count: 3; } }

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

        .thumb-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 8px;
        }

        .chip {
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
        .chip:disabled { opacity: 0.6; cursor: not-allowed; }
        .chip.danger { background: rgba(175, 75, 85, 0.8); }

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

        .lb-fade {
          animation: lbFade 140ms ease-out;
        }
        @keyframes lbFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lb-content {
          position: relative;
          width: min(92vw, 1200px);
          height: min(86vh, 820px);
          display: grid;
          grid-template-rows: auto 1fr;
          outline: none;
          touch-action: none;
        }

        .lb-pop {
          animation: lbPop 160ms ease-out;
        }
        @keyframes lbPop {
          from { transform: translateY(10px) scale(0.985); opacity: 0.8; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .lb-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          padding-right: 52px;
        }

        .lb-title {
          min-width: 0;
          max-width: 56ch;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lb-top-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .lb-stage {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.18);
          border-radius: 12px;
          overflow: hidden;
        }

        .lb-media {
          max-width: 100%;
          max-height: 100%;
          border-radius: 12px;
          background: #000;
          will-change: transform;
          user-select: none;
        }

        .lb-x, .lb-prev, .lb-next {
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
          display: grid;
          place-items: center;
          z-index: 10;
        }

        .lb-x {
          top: 0;
          right: 0;
          transform: none;
        }

        .lb-prev { left: -52px; }
        .lb-next { right: -52px; }

        @media (max-width: 640px) {
          .lb-prev { left: 8px; }
          .lb-next { right: 8px; }
          .lb-x { top: 0; right: 8px; }
          .lb-top { padding-right: 0; }
          .lb-title { white-space: normal; overflow: visible; text-overflow: unset; max-width: 100%; }
        }
      `}</style>
    </div>
  );
}