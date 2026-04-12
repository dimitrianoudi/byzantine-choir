type GalleryCacheEntry<T = unknown> = {
  expiresAt: number;
  value: T;
};

const GALLERY_CACHE_TTL_MS = 60_000;

const globalGalleryCache = globalThis as typeof globalThis & {
  __bcpGalleryCacheStore?: Map<string, GalleryCacheEntry>;
};

const galleryCacheStore =
  globalGalleryCache.__bcpGalleryCacheStore ??
  (globalGalleryCache.__bcpGalleryCacheStore = new Map<string, GalleryCacheEntry>());

export { GALLERY_CACHE_TTL_MS };

export function getGalleryCacheKey(folder: string, debug = false) {
  return `${debug ? "debug" : "live"}:${folder || "__root__"}`;
}

export function readGalleryCache<T>(key: string) {
  const entry = galleryCacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    galleryCacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeGalleryCache<T>(
  key: string,
  value: T,
  ttlMs = GALLERY_CACHE_TTL_MS
) {
  galleryCacheStore.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function clearGalleryCache() {
  galleryCacheStore.clear();
}
