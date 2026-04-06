'use client';

type PdfJsModule = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (src: unknown) => {
    promise: Promise<any>;
  };
};

type PromiseWithResolversFn = <T>() => {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;

function ensurePromiseWithResolvers() {
  const PromiseWithCompat = Promise as PromiseConstructor & {
    withResolvers?: PromiseWithResolversFn;
  };

  if (typeof PromiseWithCompat.withResolvers === 'function') return;

  PromiseWithCompat.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

async function warmPdfWorkerAsset() {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/pdf.worker.min.mjs');
  } catch {}
}

export async function getPdfJs() {
  ensurePromiseWithResolvers();

  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs: any) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return pdfjs as PdfJsModule;
    });
  }

  return pdfJsPromise;
}

export async function warmPdfJs() {
  await warmPdfWorkerAsset();
  return getPdfJs();
}
