'use client';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  storageKey: string;                         // e.g. "pdfs/....pdf"
  getUrl: (key: string) => Promise<string>;   // presign fetcher from Library
  width?: number;                             
};

const cache = new Map<string, string>(); // key -> dataURL (thumb or placeholder)

// Small inline SVG placeholder (dark card with "PDF")
function makePlaceholder(width: number, height: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f1f26"/>
          <stop offset="100%" stop-color="#14141a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="12" ry="12" fill="url(#g)"/>
      <rect x="${width - 52}" y="12" width="40" height="40" rx="8" ry="8" fill="#a21caf" opacity="0.25"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            font-weight="700" font-size="${Math.max(18, Math.floor(width/7))}" fill="#ffffffcc">PDF</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function PdfThumb({ storageKey, getUrl, width = 220 }: Props) {
  const [src, setSrc] = useState<string | null>(cache.get(storageKey) ?? null);
  const [ready, setReady] = useState(false); // avoid SSR issues
  const height = useMemo(() => Math.round((width * 4) / 3), [width]);
  const placeholder = useMemo(() => makePlaceholder(width, height), [width, height]);

  // mark as mounted (client-only work)
  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready || src) return;
    let cancelled = false;

    (async () => {
      try {
        // If we already cached (thumb or placeholder), use it
        if (cache.has(storageKey)) {
          setSrc(cache.get(storageKey)!);
          return;
        }

        const url = await getUrl(storageKey);

        // Dynamically import pdf.js only in the browser
        const pdfjs: any = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js';

        const pdf = await pdfjs.getDocument({ url }).promise;
        const page = await pdf.getPage(1);

        // Scale to desired width, keep aspect ratio
        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');

        canvas.width = Math.ceil(scaledViewport.width);
        canvas.height = Math.ceil(scaledViewport.height);

        // Some builds expect `canvas` field; include it
        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        canvas.width = canvas.height = 0;
        await pdf.destroy();

        if (!cancelled) {
          cache.set(storageKey, dataUrl);
          setSrc(dataUrl);
        }
      } catch {
        // Any error → use placeholder (and cache it to avoid rework)
        if (!cancelled) {
          cache.set(storageKey, placeholder);
          setSrc(placeholder);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [ready, src, storageKey, getUrl, width, placeholder]);

  return (
    <div className="w-full">
      <div
        className="w-full rounded-md overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center"
        style={{ width, height }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src || placeholder}
          alt="Προεπισκόπηση PDF"
          className="block w-full h-full object-cover"
          width={width}
          height={height}
          onError={(e) => {
            // If the <img> fails to decode for any reason, hard-fallback to placeholder
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
        />
      </div>
    </div>
  );
}
