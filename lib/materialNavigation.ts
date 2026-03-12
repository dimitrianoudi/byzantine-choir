const AKOLOUTHIES_ROOT = "Ακολουθίες";
const MATERIAL_ROOT_PATH = "/material";
const MATERIAL_AKOLOUTHIES_PATH = "/material/akolouthies";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildMaterialUrlForPrefix(prefix: string) {
  const trimmed = prefix.replace(/\/+$/, "");
  if (!trimmed) return MATERIAL_ROOT_PATH;

  const parts = trimmed.split("/").filter(Boolean);
  if (parts[0] === AKOLOUTHIES_ROOT) {
    const rest = parts.slice(1).map((part) => encodeURIComponent(part)).join("/");
    return rest ? `${MATERIAL_AKOLOUTHIES_PATH}/${rest}` : MATERIAL_AKOLOUTHIES_PATH;
  }

  return `${MATERIAL_ROOT_PATH}?prefix=${encodeURIComponent(prefix)}`;
}

export function getMaterialPrefixFromUrl(pathname: string, search = "") {
  if (pathname.startsWith(MATERIAL_AKOLOUTHIES_PATH)) {
    const parts = pathname
      .split("/")
      .filter(Boolean)
      .slice(2)
      .map(safeDecode)
      .filter(Boolean);

    return parts.length ? `${AKOLOUTHIES_ROOT}/${parts.join("/")}/` : `${AKOLOUTHIES_ROOT}/`;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("prefix") || "";
}

export function buildAkolouthiesPrefixFromParts(parts?: string[]) {
  const decoded = (parts || []).map(safeDecode).filter(Boolean);
  return decoded.length ? `${AKOLOUTHIES_ROOT}/${decoded.join("/")}/` : `${AKOLOUTHIES_ROOT}/`;
}
