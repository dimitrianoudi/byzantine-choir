export const MATERIAL_COURSE_FOLDER_BY_SLUG = {
  kids: "Ψαλτική παιδικής φωνής",
  women: "Ψαλτική γυναικείας φωνής",
  men: "Ψαλτική ανδρικής φωνής",
} as const;

export const MATERIAL_COURSE_SLUG_BY_FOLDER = {
  "Ψαλτική παιδικής φωνής": "kids",
  "Ψαλτική γυναικείας φωνής": "women",
  "Ψαλτική ανδρικής φωνής": "men",
} as const;

export type MaterialCourseSlug = keyof typeof MATERIAL_COURSE_FOLDER_BY_SLUG;

export function isMaterialAudioKey(key: string) {
  const lower = key.toLowerCase();
  const okPath = key.startsWith("Μαθήματα/") && lower.includes("/podcasts/");
  const okExt = lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".aac");
  return okPath && okExt;
}

export function displayMaterialFilename(key: string) {
  const base = key.split("/").pop() || key;
  return base.replace(/^\d{13}[-_]/, "");
}

export function materialAudioContentType(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  return "application/octet-stream";
}

export function parseMaterialPodcastKey(key: string) {
  if (!isMaterialAudioKey(key)) return null;

  const parts = key.split("/").filter(Boolean);
  if (parts.length !== 6) return null;

  const [root, courseFolder, year, lessonFolder, typeFolder] = parts;
  if (root !== "Μαθήματα" || typeFolder !== "podcasts") return null;
  if (!/^\d{4}$/.test(year)) return null;

  const courseSlug = MATERIAL_COURSE_SLUG_BY_FOLDER[
    courseFolder as keyof typeof MATERIAL_COURSE_SLUG_BY_FOLDER
  ];
  if (!courseSlug) return null;

  const lessonMatch = lessonFolder.match(/^Μάθημα\s+(\d{1,2})$/);
  if (!lessonMatch) return null;

  return {
    courseFolder,
    courseSlug,
    year,
    lesson: lessonMatch[1].padStart(2, "0"),
    name: displayMaterialFilename(key),
  };
}

export function buildMaterialAudioPathFromKey(key: string) {
  const parsed = parseMaterialPodcastKey(key);
  if (!parsed) return null;

  return `/material/audio/${encodeURIComponent(parsed.courseSlug)}/${encodeURIComponent(
    parsed.year
  )}/${encodeURIComponent(parsed.lesson)}/${encodeURIComponent(parsed.name)}`;
}

export function getMaterialPodcastPrefix(courseSlug: string, year: string, lesson: string) {
  const courseFolder =
    MATERIAL_COURSE_FOLDER_BY_SLUG[courseSlug as keyof typeof MATERIAL_COURSE_FOLDER_BY_SLUG];
  if (!courseFolder) return null;
  if (!/^\d{4}$/.test(year)) return null;
  if (!/^\d{1,2}$/.test(lesson)) return null;

  return `Μαθήματα/${courseFolder}/${year}/Μάθημα ${lesson.padStart(2, "0")}/podcasts/`;
}
