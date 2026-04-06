const CACHE_PREFIX = 'bcp-useful-offline-';
const PAGE_CACHE = `${CACHE_PREFIX}pages-v1`;
const API_CACHE = `${CACHE_PREFIX}api-v1`;
const PDF_CACHE = `${CACHE_PREFIX}pdfs-v3`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`;
const ACTIVE_CACHES = [PAGE_CACHE, API_CACHE, PDF_CACHE, ASSET_CACHE];
const USEFUL_ROOT = 'Χρήσιμα';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  if (isUsefulMaterialPage(url)) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  if (isUsefulListRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isUsefulPdfRequest(url)) {
    return;
  }
});

function decodeValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isUsefulPrefix(value) {
  const decoded = decodeValue(value || '');
  return decoded === USEFUL_ROOT || decoded.startsWith(`${USEFUL_ROOT}/`);
}

function isUsefulMaterialPage(url) {
  if (url.pathname !== '/material') return false;
  return isUsefulPrefix(url.searchParams.get('prefix') || '');
}

function isUsefulListRequest(url) {
  if (url.pathname !== '/api/files/list') return false;
  return isUsefulPrefix(url.searchParams.get('prefix') || '');
}

function isUsefulPdfRequest(url) {
  if (!url.pathname.startsWith('/material/pdf/')) return false;
  return decodeValue(url.pathname).includes(`/material/pdf/${USEFUL_ROOT}/`);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline content unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const fresh = await networkPromise;
  if (fresh) return fresh;

  return new Response('Offline asset unavailable.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
