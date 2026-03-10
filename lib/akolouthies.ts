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

export function akolouthiesContentType(key: string) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio/mpeg";
  if (k.endsWith(".m4a")) return "audio/mp4";
  if (k.endsWith(".aac")) return "audio/aac";
  return "application/octet-stream";
}
