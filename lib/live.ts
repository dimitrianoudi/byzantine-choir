export const LIVE_STREAM = {
  title: 'Ζωντανή Μετάδοση',
  channelName: 'Φροντιστήριο Ψαλτικής',
  channelId: 'UCBVdCrn2tfUQKu3Tgn0mb5w',
  channelUrl: 'https://www.youtube.com/channel/UCBVdCrn2tfUQKu3Tgn0mb5w',
  ctaLabel: 'Live',
} as const;

export type LiveStatusState = 'live' | 'offline' | 'unknown';

export type LiveStatusSnapshot = {
  state: LiveStatusState;
  checkedAt: string;
};

export function getYouTubeLiveEmbedUrl() {
  const params = new URLSearchParams({
    channel: LIVE_STREAM.channelId,
    autoplay: '0',
    playsinline: '1',
    rel: '0',
  });

  return `https://www.youtube.com/embed/live_stream?${params.toString()}`;
}

export function getYouTubeLivePageUrl() {
  return `${LIVE_STREAM.channelUrl}/live`;
}
