import { standardAudioContentType } from "@/lib/audioMime";
import {
  MATERIAL_COURSES,
  buildMaterialLessonPrefix,
  getMaterialCourse,
  getMaterialGroup,
  getMaterialYear,
  type MaterialCourseSlug,
} from "@/lib/materialCatalog";

export type { MaterialCourseSlug } from "@/lib/materialCatalog";

export const MATERIAL_COURSE_FOLDER_BY_SLUG = Object.fromEntries(
  MATERIAL_COURSES.map((course) => [course.slug, course.folder])
) as Record<MaterialCourseSlug, string>;

export const MATERIAL_COURSE_SLUG_BY_FOLDER = Object.fromEntries(
  MATERIAL_COURSES.map((course) => [course.folder, course.slug])
) as Record<string, MaterialCourseSlug>;

const USEFUL_ROOT = "Χρήσιμα/";

type MaterialTypeFolder = "podcasts" | "pdfs";

export function isMaterialAudioKey(key: string) {
  const lower = key.toLowerCase();
  const okPath = key.startsWith("Μαθήματα/") && lower.includes("/podcasts/");
  const okExt = lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".aac");
  return okPath && okExt;
}

export function isMaterialPdfKey(key: string) {
  const lower = key.toLowerCase();
  if (key.startsWith(USEFUL_ROOT)) return lower.endsWith(".pdf");
  return key.startsWith("Μαθήματα/") && lower.includes("/pdfs/") && lower.endsWith(".pdf");
}

export function displayMaterialFilename(key: string) {
  const base = key.split("/").pop() || key;
  return base.replace(/^\d{13}[-_]/, "");
}

export function materialAudioContentType(key: string) {
  return standardAudioContentType(key);
}

export function materialPdfContentType() {
  return "application/pdf";
}

function parseMaterialKey(key: string, typeFolder: MaterialTypeFolder) {
  const parts = key.split("/").filter(Boolean);
  if (parts.length !== 6 && parts.length !== 7) return null;

  const [root, courseFolder, yearFolder] = parts;
  if (root !== "Μαθήματα") return null;

  const course = getMaterialCourse(courseFolder);
  const year = getMaterialYear(yearFolder);
  if (!course || !year) return null;

  const grouped = parts.length === 7;
  if (grouped !== year.grouped) return null;

  const groupFolder = grouped ? parts[3] : undefined;
  const lessonFolder = parts[grouped ? 4 : 3];
  const actualTypeFolder = parts[grouped ? 5 : 4];
  if (actualTypeFolder !== typeFolder) return null;

  const group = grouped
    ? getMaterialGroup(course.slug, year.id, groupFolder)
    : null;
  if (grouped && !group) return null;

  const lessonMatch = lessonFolder.match(/^Μάθημα\s+(\d{1,2})$/);
  if (!lessonMatch) return null;

  return {
    courseFolder: course.folder,
    courseSlug: course.slug,
    year: year.id,
    group: group?.slug,
    lesson: lessonMatch[1].padStart(2, "0"),
    name: displayMaterialFilename(key),
  };
}

export function parseMaterialPodcastKey(key: string) {
  if (!isMaterialAudioKey(key)) return null;
  return parseMaterialKey(key, "podcasts");
}

export function parseMaterialPdfKey(key: string) {
  if (!isMaterialPdfKey(key)) return null;
  return parseMaterialKey(key, "pdfs");
}

export function buildMaterialAudioPathFromKey(key: string) {
  const parsed = parseMaterialPodcastKey(key);
  if (!parsed) return null;

  const parts = [
    parsed.courseSlug,
    parsed.year,
    ...(parsed.group ? [parsed.group] : []),
    parsed.lesson,
    parsed.name,
  ];
  return `/material/audio/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

export function buildMaterialPdfPathFromKey(key: string) {
  if (!isMaterialPdfKey(key)) return null;
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/material/pdf/${encodedKey}`;
}

function getMaterialPrefix(
  courseSlug: string,
  year: string,
  lesson: string,
  typeFolder: MaterialTypeFolder,
  group?: string
) {
  const course = getMaterialCourse(courseSlug);
  if (!course) return null;

  const lessonPrefix = buildMaterialLessonPrefix(
    course.slug,
    year,
    lesson,
    group
  );
  return lessonPrefix ? `${lessonPrefix}${typeFolder}/` : null;
}

export function getMaterialPodcastPrefix(
  courseSlug: string,
  year: string,
  lesson: string,
  group?: string
) {
  return getMaterialPrefix(courseSlug, year, lesson, "podcasts", group);
}

export function getMaterialPdfPrefix(
  courseSlug: string,
  year: string,
  lesson: string,
  group?: string
) {
  return getMaterialPrefix(courseSlug, year, lesson, "pdfs", group);
}
