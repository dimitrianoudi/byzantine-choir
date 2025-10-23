'use client';

import { useEffect, useState } from 'react';

type GalleryItem = {
  id: string;
  type: 'image' | 'video';
  src: string;
  thumb: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number | null;
};

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/gallery', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Load failed');
        setItems(json.items || []);
      } catch (e: any) {
        setErr(e.message || 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openAt = (i: number) => setLightbox({ open: true, index: i });
  const close = () => setLightbox({ open: false, index: 0 });
  const prev = () =>
    setLightbox((v) => ({ ...v, index: (v.index + items.length - 1) % items.length }));
  const next = () => setLightbox((v) => ({ ...v, index: (v.index + 1) % items.length }));

  return (
    <div className="space-y-6">
      <div className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Στιγμιότυπα
        </h1>
      </div>

      {loading && <div className="card p-6">Φόρτωση…</div>}
      {err && <div className="card p-6 text-red">{err}</div>}

      {!loading && !err && (
        <div className="masonry">
          {items.map((it, i) => (
            <button
              key={it.id}
              className="masonry-item"
              onClick={() => openAt(i)}
              aria-label="Προβολή"
            >
              {it.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb} alt="" className="thumb" loading="lazy" />
              ) : (
                <div className="thumb video-thumb">
                  <div className="video-badge">▶</div>
                </div>
              )}
            </button>
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

            {items[lightbox.index].type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={items[lightbox.index].src} alt="" className="lb-media" />
            ) : (
              <video className="lb-media" src={items[lightbox.index].src} controls playsInline />
            )}
          </div>
        </div>
      )}

      {/* SINGLE styled-jsx block to avoid nesting error */}
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

        .masonry-item {
          display: block;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0 0 1rem;
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

        /* Lightbox */
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
        }
      `}</style>
    </div>
  );
}
