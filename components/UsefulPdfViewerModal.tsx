'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getUsefulOfflinePdfResponse } from '@/lib/usefulOffline';

type Props = {
  open: boolean;
  title: string;
  pdfUrl: string;
  onClose: () => void;
};

export default function UsefulPdfViewerModal({ open, title, pdfUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const pdfDocRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLoading(false);
      setPageNumber(1);
      setPageCount(0);
      if (pdfDocRef.current) {
        try {
          void pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setPageNumber(1);
      setPageCount(0);

      try {
        const response = await getUsefulOfflinePdfResponse(pdfUrl);
        if (!response) {
          throw new Error('Το PDF δεν είναι διαθέσιμο offline σε αυτή τη συσκευή.');
        }

        const data = await response.arrayBuffer();
        const pdfjs: any = await import('pdfjs-dist');
        const task = pdfjs.getDocument({
          data,
          disableWorker: true,
          useWorkerFetch: false,
        });
        const pdf = await task.promise;

        if (cancelled) {
          try {
            await pdf.destroy();
          } catch {}
          return;
        }

        if (pdfDocRef.current) {
          try {
            await pdfDocRef.current.destroy();
          } catch {}
        }

        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages || 1);
        setPageNumber(1);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Αποτυχία φόρτωσης PDF.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl]);

  useEffect(() => {
    if (!open || loading || error || !pdfDocRef.current || !canvasRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        const pdf = pdfDocRef.current;
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, Math.min(window.innerWidth - 48, containerRef.current?.clientWidth || 720));
        const scale = Math.max(0.75, Math.min(2.5, availableWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const deviceScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * deviceScale);
        canvas.height = Math.floor(viewport.height * deviceScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Αποτυχία απόδοσης PDF.');
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [open, loading, error, pageNumber]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setPageNumber((prev) => Math.max(1, prev - 1));
      if (event.key === 'ArrowRight') setPageNumber((prev) => Math.min(pageCount || 1, prev + 1));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, pageCount]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="pdf-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pdf-shell card" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-toolbar">
          <div className="pdf-title">{title}</div>
          <div className="pdf-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              disabled={loading || !!error || pageNumber <= 1}
            >
              Προηγ.
            </button>
            <div className="pdf-page-indicator">
              {pageCount > 0 ? `${pageNumber} / ${pageCount}` : '...'}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPageNumber((prev) => Math.min(pageCount || 1, prev + 1))}
              disabled={loading || !!error || pageNumber >= pageCount}
            >
              Επόμ.
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Κλείσιμο
            </button>
          </div>
        </div>

        <div className="pdf-body" ref={containerRef}>
          {loading && <div className="pdf-status">Φόρτωση PDF...</div>}
          {!loading && error && <div className="pdf-status pdf-status-error">{error}</div>}
          {!loading && !error && <canvas ref={canvasRef} className="pdf-canvas" />}
        </div>
      </div>

      <style jsx>{`
        .pdf-overlay {
          position: fixed;
          inset: 0;
          z-index: 2200;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .pdf-shell {
          width: min(96vw, 960px);
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }

        .pdf-toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .pdf-title {
          font-weight: 700;
          color: var(--text);
          min-width: 0;
          word-break: break-word;
        }

        .pdf-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pdf-page-indicator {
          min-width: 56px;
          text-align: center;
          font-size: 12px;
          color: var(--muted);
        }

        .pdf-body {
          overflow: auto;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 12px;
          padding: 12px;
          min-height: 220px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .pdf-status {
          width: 100%;
          text-align: center;
          color: var(--muted);
          padding: 48px 16px;
        }

        .pdf-status-error {
          color: #b42318;
        }

        .pdf-canvas {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0 auto;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </div>,
    document.body
  );
}
