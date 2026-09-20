export const SITE_NAME = "Ψαλτική Παιδεία";
export const SITE_TITLE =
  "Φροντιστήριο Ψαλτικής Ευόσμου | Βυζαντινή Μουσική";
export const SITE_DESCRIPTION =
  "Ενοριακό Φροντιστήριο Ψαλτικής στον Εύοσμο Θεσσαλονίκης με μαθήματα Βυζαντινής Μουσικής, Τυπικού και πρακτικής αναλογίου για παιδιά και ενήλικες.";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.frontistiriopsaltikis.gr";

export const SITE_URL = new URL(
  configuredSiteUrl.startsWith("http://") ||
  configuredSiteUrl.startsWith("https://")
    ? configuredSiteUrl
    : `https://${configuredSiteUrl}`,
).origin;

export function absoluteUrl(path: string) {
  return new URL(path, `${SITE_URL}/`).toString();
}
