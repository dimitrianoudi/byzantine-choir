'use client';

export const USEFUL_ROOT = 'Χρήσιμα';
export const USEFUL_OFFLINE_SW_URL = '/useful-offline-sw.js';
export const USEFUL_OFFLINE_CACHE_PREFIX = 'bcp-useful-offline-';
export const USEFUL_OFFLINE_PAGE_CACHE = `${USEFUL_OFFLINE_CACHE_PREFIX}pages-v1`;
export const USEFUL_OFFLINE_API_CACHE = `${USEFUL_OFFLINE_CACHE_PREFIX}api-v1`;
export const USEFUL_OFFLINE_PDF_CACHE = `${USEFUL_OFFLINE_CACHE_PREFIX}pdfs-v1`;
export const USEFUL_OFFLINE_ASSET_CACHE = `${USEFUL_OFFLINE_CACHE_PREFIX}assets-v1`;
export const USEFUL_OFFLINE_CACHE_NAMES = [
  USEFUL_OFFLINE_PAGE_CACHE,
  USEFUL_OFFLINE_API_CACHE,
  USEFUL_OFFLINE_PDF_CACHE,
  USEFUL_OFFLINE_ASSET_CACHE,
];

type WarmUsefulOfflineProgress = {
  completed: number;
  total: number;
  warmedCount: number;
};

function canUseCacheStorage() {
  return typeof window !== 'undefined' && 'caches' in window;
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

async function cacheSuccessfulGet(cacheName: string, url: string) {
  if (!canUseCacheStorage()) return false;

  const cache = await caches.open(cacheName);
  const request = new Request(url, { credentials: 'same-origin' });
  const existing = await cache.match(request);
  if (existing) return true;

  const response = await fetch(request);
  if (!response.ok) return false;

  await cache.put(request, response.clone());
  return true;
}

async function getUsefulOfflineRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  const registrations = await navigator.serviceWorker.getRegistrations();
  return (
    registrations.find((registration) => {
      const scriptUrl =
        registration.active?.scriptURL ||
        registration.waiting?.scriptURL ||
        registration.installing?.scriptURL ||
        '';
      return scriptUrl.endsWith(USEFUL_OFFLINE_SW_URL);
    }) || null
  );
}

export function isUsefulPrefix(prefix: string) {
  return prefix === USEFUL_ROOT || prefix.startsWith(`${USEFUL_ROOT}/`);
}

export function supportsUsefulOffline() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'caches' in window
  );
}

export async function registerUsefulOfflineSupport(enabled: boolean) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!enabled) {
    const existing = await getUsefulOfflineRegistration();
    if (existing) {
      try {
        await existing.unregister();
      } catch {}
    }
    await clearUsefulOfflineCaches();
    return;
  }

  try {
    await navigator.serviceWorker.register(USEFUL_OFFLINE_SW_URL, { scope: '/' });
  } catch {}
}

export async function clearUsefulOfflineCaches() {
  if (!canUseCacheStorage()) return;
  await Promise.all(USEFUL_OFFLINE_CACHE_NAMES.map((name) => caches.delete(name)));
}

export async function cacheUsefulFolderResponse(prefix: string, requestUrl: string, response: Response) {
  if (!isUsefulPrefix(prefix) || !canUseCacheStorage() || !response.ok) return;

  const cache = await caches.open(USEFUL_OFFLINE_API_CACHE);
  await cache.put(new Request(requestUrl, { credentials: 'same-origin' }), response);
}

export async function warmUsefulMaterialPage(url: string) {
  try {
    await cacheSuccessfulGet(USEFUL_OFFLINE_PAGE_CACHE, url);
  } catch {}
}

export async function getCachedUsefulOfflinePdfs(urls: string[]) {
  if (!canUseCacheStorage()) return [];

  const cache = await caches.open(USEFUL_OFFLINE_PDF_CACHE);
  const unique = uniqueUrls(urls);
  const matches = await Promise.all(
    unique.map(async (url) => {
      const request = new Request(url, { credentials: 'same-origin' });
      const response = await cache.match(request);
      return response ? url : null;
    })
  );

  return matches.filter((value): value is string => !!value);
}

export async function getUsefulOfflinePdfResponse(url: string) {
  if (!canUseCacheStorage()) return null;

  const cache = await caches.open(USEFUL_OFFLINE_PDF_CACHE);
  const request = new Request(url, { credentials: 'same-origin' });
  const cached = (await cache.match(request)) || (await cache.match(url));
  if (cached) return cached;

  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const response = await fetch(request);
  if (!response.ok) return null;

  await cache.put(request, response.clone());
  return response;
}

export async function warmUsefulOfflinePdfs(
  urls: string[],
  options?: {
    onProgress?: (progress: WarmUsefulOfflineProgress) => void;
  }
) {
  if (!canUseCacheStorage() || typeof navigator === 'undefined' || !navigator.onLine) return [];

  const queue = uniqueUrls(urls);
  const warmed: string[] = [];
  let completed = 0;
  const total = queue.length;
  const concurrency = 2;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      try {
        const ok = await cacheSuccessfulGet(USEFUL_OFFLINE_PDF_CACHE, next);
        if (ok) warmed.push(next);
      } catch {}
      completed += 1;
      options?.onProgress?.({ completed, total, warmedCount: warmed.length });
    }
  });

  await Promise.all(workers);
  return warmed;
}
