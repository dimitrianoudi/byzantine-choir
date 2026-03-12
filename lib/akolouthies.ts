export function isAkolouthiesAudioKey(key: string) {
  const k = key.toLowerCase();
  const okPath = key.startsWith("Ακολουθίες/");
  const okExt = k.endsWith(".mp3") || k.endsWith(".m4a") || k.endsWith(".aac");
  return okPath && okExt;
}

export function displayAkolouthiesFilename(key: string) {
  const base = key.split("/").pop() || key;
  return base.replace(/^\d{13}[-_]/, "");
}

export function parseAkolouthiesAudioKey(key: string) {
  if (!isAkolouthiesAudioKey(key)) return null;

  const parts = key.split("/").filter(Boolean);
  if (parts.length !== 5) return null;

  const [root, year, date, typeFolder] = parts;
  if (root !== "Ακολουθίες" || typeFolder !== "podcasts") return null;
  if (!/^\d{4}$/.test(year)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    year,
    date,
    name: displayAkolouthiesFilename(key),
  };
}

export function buildAkolouthiesAudioPathFromKey(key: string) {
  const parsed = parseAkolouthiesAudioKey(key);
  if (!parsed) return null;

  return `/akolouthies/audio/${encodeURIComponent(parsed.date)}/${encodeURIComponent(parsed.name)}`;
}

export function akolouthiesContentType(key: string) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio/mpeg";
  if (k.endsWith(".m4a")) return "audio/mp4";
  if (k.endsWith(".aac")) return "audio/aac";
  return "application/octet-stream";
}
