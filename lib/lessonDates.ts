import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";
import {
  getMaterialCourse,
  getMaterialGroup,
  getMaterialLessonCount,
  getMaterialLessonDate,
  getMaterialYear,
  type MaterialCourseSlug,
} from "@/lib/materialCatalog";

export type LessonDateMap = Record<string, string>;
type StoredLessonDateMap = Record<string, string | null>;

type LessonParentPrefix = {
  courseSlug: MaterialCourseSlug;
  courseFolder: string;
  year: string;
  yearFolder: string;
  group?: string;
  groupFolder?: string;
  prefix: string;
};

type LessonFolderPrefix = LessonParentPrefix & {
  lesson: string;
  lessonPrefix: string;
};

const LESSON_DATES_FILENAME = "_lesson-dates.json";

function safe(value?: string) {
  return String(value || "").trim();
}

export function isIsoLessonDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(safe(value));
}

export function normalizeLessonNumber(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || num > 99) return null;
  return String(num).padStart(2, "0");
}

export function parseLessonFolderName(folderName: string) {
  const match = safe(folderName).match(/^Μάθημα\s+(\d{1,2})$/);
  return match ? normalizeLessonNumber(match[1]) : null;
}

export function parseMaterialLessonParentPrefix(prefix: string): LessonParentPrefix | null {
  const trimmed = safe(prefix).replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;

  const [root, courseFolder, yearFolder, groupFolder] = parts;
  if (root !== "Μαθήματα") return null;

  const course = getMaterialCourse(courseFolder);
  const year = getMaterialYear(yearFolder);
  if (!course || !year) return null;

  const group = year.grouped
    ? getMaterialGroup(course.slug, year.id, groupFolder)
    : null;
  if (year.grouped ? parts.length !== 4 || !group : parts.length !== 3) {
    return null;
  }

  const canonicalParts = ["Μαθήματα", course.folder, year.folder];
  if (group) canonicalParts.push(group.folder);

  return {
    courseSlug: course.slug,
    courseFolder: course.folder,
    year: year.id,
    yearFolder: year.folder,
    group: group?.slug,
    groupFolder: group?.folder,
    prefix: `${canonicalParts.join("/")}/`,
  };
}

export function parseMaterialLessonFolderPrefix(prefix: string): LessonFolderPrefix | null {
  const trimmed = safe(prefix).replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 4 && parts.length !== 5) return null;

  const lessonFolder = parts[parts.length - 1];
  const lesson = parseLessonFolderName(lessonFolder);
  const parent = parseMaterialLessonParentPrefix(parts.slice(0, -1).join("/"));
  if (!parent || !lesson) return null;

  return {
    ...parent,
    lesson,
    lessonPrefix: `${trimmed}/`,
  };
}

function lessonDatesKey(parentPrefix: string) {
  return `${parentPrefix}${LESSON_DATES_FILENAME}`;
}

function sanitizeStoredLessonDateMap(raw: unknown): StoredLessonDateMap {
  if (!raw || typeof raw !== "object") return {};

  const out: StoredLessonDateMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const lesson = normalizeLessonNumber(key);
    if (!lesson) continue;
    if (value === null) {
      out[lesson] = null;
      continue;
    }
    const date = typeof value === "string" ? value.trim() : "";
    if (!isIsoLessonDate(date)) continue;
    out[lesson] = date;
  }
  return out;
}

async function getStoredLessonDateMap(parentPrefix: string): Promise<StoredLessonDateMap> {
  if (!BUCKET) return {};

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: lessonDatesKey(parentPrefix),
      })
    );

    const raw = await res.Body?.transformToString();
    if (!raw) return {};
    return sanitizeStoredLessonDateMap(JSON.parse(raw));
  } catch (err: any) {
    const code = err?.name || err?.Code || err?.code;
    if (code === "NoSuchKey" || code === "NotFound") return {};
    console.error("LESSON_DATES_READ_ERROR:", err);
    return {};
  }
}

function getDefaultLessonDateMap(parent: LessonParentPrefix): LessonDateMap {
  if (!parent.group) return {};

  const count = getMaterialLessonCount(
    parent.courseSlug,
    parent.year,
    parent.group
  );
  const dates: LessonDateMap = {};
  for (let lesson = 1; lesson <= count; lesson += 1) {
    const date = getMaterialLessonDate(
      parent.courseSlug,
      parent.year,
      parent.group,
      lesson
    );
    if (date) dates[String(lesson).padStart(2, "0")] = date;
  }
  return dates;
}

export async function getLessonDateMap(
  courseFolder: string,
  yearFolder: string,
  groupFolder?: string
): Promise<LessonDateMap> {
  const prefix = ["Μαθήματα", courseFolder, yearFolder, groupFolder]
    .filter(Boolean)
    .join("/");
  return getLessonDateMapForParentPrefix(prefix);
}

export async function getLessonDateMapForParentPrefix(prefix: string) {
  const parsed = parseMaterialLessonParentPrefix(prefix);
  if (!parsed) return {};

  const dates = getDefaultLessonDateMap(parsed);
  const storedDates = await getStoredLessonDateMap(parsed.prefix);
  for (const [lesson, date] of Object.entries(storedDates)) {
    if (date) dates[lesson] = date;
    else delete dates[lesson];
  }
  return dates;
}

export async function saveLessonDateForPrefix(prefix: string, date: string) {
  const parsed = parseMaterialLessonFolderPrefix(prefix);
  if (!parsed) {
    throw new Error("Μη έγκυρος φάκελος μαθήματος.");
  }

  if (!BUCKET) return;

  const dates = await getStoredLessonDateMap(parsed.prefix);
  const defaultDate = getMaterialLessonDate(
    parsed.courseSlug,
    parsed.year,
    parsed.group,
    parsed.lesson
  );

  if (date && date !== defaultDate) {
    dates[parsed.lesson] = date;
  } else if (!date && defaultDate) {
    dates[parsed.lesson] = null;
  } else {
    delete dates[parsed.lesson];
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: lessonDatesKey(parsed.prefix),
      ContentType: "application/json",
      Body: JSON.stringify(dates, null, 2),
    })
  );
}
