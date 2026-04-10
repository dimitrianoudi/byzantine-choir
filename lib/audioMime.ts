export function standardAudioContentType(filename: string, fallback?: string) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (fallback === 'audio/x-m4a') return 'audio/mp4';
  return fallback || 'application/octet-stream';
}
