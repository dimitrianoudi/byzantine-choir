type ListingCacheEntry<T = unknown> = {
  expiresAt: number;
  value: T;
};

export const LISTING_CACHE_TTL_MS = 60_000;

const globalListingCache = globalThis as typeof globalThis & {
  __bcpListingCacheStore?: Map<string, ListingCacheEntry>;
};

const listingCacheStore =
  globalListingCache.__bcpListingCacheStore ??
  (globalListingCache.__bcpListingCacheStore = new Map<string, ListingCacheEntry>());

export function readListingCache<T>(key: string) {
  const entry = listingCacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    listingCacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeListingCache<T>(
  key: string,
  value: T,
  ttlMs = LISTING_CACHE_TTL_MS
) {
  listingCacheStore.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function clearListingCache() {
  listingCacheStore.clear();
}

export function getFilesListCacheKey(opts: {
  prefix: string;
  query: string;
  typeFilter: "podcast" | "pdf" | null;
}) {
  const { prefix, query, typeFilter } = opts;
  return `files:${prefix || "__root__"}:${query || "__all__"}:${typeFilter || "__all__"}`;
}

export function getPublicAkolouthiesCacheKey(year: string, date: string) {
  return `public-akolouthies:${year || "__year__"}:${date || "__latest__"}`;
}
