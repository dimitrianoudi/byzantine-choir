'use client';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  storageKey: string;                         // S3 key (e.g., "pdfs/foo.pdf")
  getUrl: (key: string) => Promise<string>;   // your presign fetcher
  width?: number;
};

const cache = new Map<string, string>(); // key -> dataURL

export default function PdfThumb({ storageKey, getUrl, width = 220 }: Props) {
  const [src, setSrc] = useState<string | null>(cache.get(storageKey) ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // guard against SSR
  const height = useMemo(() => Math.round((width * 4) / 3), [width]);

  // mark as mounted (prevents any pdf.js work during SSR)
  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready || src) return;
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        if (cache.has(storageKey)) {
          setSrc(cache.get(storageKey)!);
          return;
        }

        const url = await getUrl(storageKey);

        // Dynamically import pdf.js only in the browser
        const pdfjs: any = await import('pdfjs-dist');
        // Set worker from CDN (avoids bundling the worker)
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js';

        const pdf = await pdfjs.getDocument({ url }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');

        canvas.width = Math.ceil(scaledViewport.width);
        canvas.height = Math.ceil(scaledViewport.height);

        // Some pdfjs distributions expect a `canvas` prop alongside context
        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        cache.set(storageKey, dataUrl);
        if (!cancelled) setSrc(dataUrl);

        // cleanup
        canvas.width = canvas.height = 0;
        await pdf.destroy();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'PDF render error');
      }
    })();

    return () => { cancelled = true; };
  }, [ready, src, storageKey, getUrl, width]);

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
