import 'server-only';

import { type LiveStatusSnapshot, getYouTubeLivePageUrl } from '@/lib/live';

const CANONICAL_HREF_RE = /<link rel="canonical" href="([^"]+)"/i;

function getStatusPageUrl() {
  return getYouTubeLivePageUrl();
}

export async function getLiveStatus(): Promise<LiveStatusSnapshot> {
  const response = await fetch(getStatusPageUrl(), {
    cache: 'no-store',
    next: { revalidate: 0 },
    headers: {
      'accept-language': 'el,en;q=0.9',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube live check failed with status ${response.status}`);
  }

  const html = await response.text();
  const canonicalHref = html.match(CANONICAL_HREF_RE)?.[1] ?? '';
  const resolvedHref = canonicalHref || response.url;

  return {
    state: resolvedHref.includes('/watch?v=') ? 'live' : 'offline',
    checkedAt: new Date().toISOString(),
  };
}

export async function getSafeLiveStatus(): Promise<LiveStatusSnapshot> {
  try {
    return await getLiveStatus();
  } catch {
    return {
      state: 'unknown',
      checkedAt: new Date().toISOString(),
    };
  }
}
