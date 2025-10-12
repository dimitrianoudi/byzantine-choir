'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';

// worker (CDN) – avoids bundling the worker
GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js';

type Props = {
  storageKey: string;
  getUrl: (key: string) => Promise<string>;
  width?: number;
};

const cache = new Map<string, string>(); // key -> dataURL

export default function PdfThumb({ storageKey, getUrl, width = 220 }: Props) {
  const [src, setSrc] = useState<string | null>(cache.get(storageKey) ?? null);
  const [err, setErr] = useState<string | null>(null);
  const height = useMemo(() => Math.round((width * 4) / 3), [width]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setErr(null);
        if (cache.has(storageKey)) {
          setSrc(cache.get(storageKey)!);
          return;
        }

        const url = await getUrl(storageKey);

        const pdf: PDFDocumentProxy = await getDocument({ url }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');

        canvas.width = Math.ceil(scaledViewport.width);
        canvas.height = Math.ceil(scaledViewport.height);

        // ✅ v4 typings often expect the canvas element as well
        await page
          .render({
            canvasContext: ctx,
            viewport: scaledViewport,
            canvas,
          })
          .promise;

        const dataUrl = canvas.toDataURL('image/png');
        cache.set(storageKey, dataUrl);
        if (!cancelled) setSrc(dataUrl);

        // cleanup
        canvas.width = canvas.height = 0;
        await pdf.destroy();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'PDF render error');
      }
    };

    if (!src) run();
    return () => {
      cancelled = true;
    };
  }, [storageKey, getUrl, src, width]);

  return (
    <div className="w-full">
      <div
        className="w-full rounded-md overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center"
        style={{ width, height }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Προεπισκόπηση PDF"
            className="block w-full h-full object-cover"
            width={width}
            height={height}
          />
        ) : err ? (
          <div className="text-xs text-red-300 p-2 text-center">Σφάλμα προεπισκόπησης</div>
        ) : (
          <div className="animate-pulse text-xs text-white/60">Φόρτωση…</div>
        )}
      </div>
    </div>
  );
}
