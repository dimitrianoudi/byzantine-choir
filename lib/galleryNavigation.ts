function safeDecodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function normalizeGalleryPrefix(prefix: string) {
  const trimmed = String(prefix || "").replace(/^\/+|\/+$/g, "");
  return trimmed ? `${trimmed}/` : "";
}

export function buildGalleryPrefixFromParts(parts?: string[]) {
  if (!parts?.length) return "";
  return normalizeGalleryPrefix(parts.map(safeDecodeSegment).filter(Boolean).join("/"));
}

export function buildGalleryHref(prefix: string) {
  const trimmed = normalizeGalleryPrefix(prefix).replace(/\/$/, "");
  if (!trimmed) return "/gallery";

  const encodedParts = trimmed
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part));

  return `/gallery/${encodedParts.join("/")}`;
}
