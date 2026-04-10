import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";

export type LessonDateMap = Record<string, string>;

type LessonParentPrefix = {
  courseFolder: string;
  year: string;
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
  if (parts.length !== 3) return null;

  const [root, courseFolder, year] = parts;
  if (root !== "Μαθήματα" || !/^\d{4}$/.test(year)) return null;

  return {
    courseFolder,
    year,
    prefix: `${trimmed}/`,
  };
}

export function parseMaterialLessonFolderPrefix(prefix: string): LessonFolderPrefix | null {
  const trimmed = safe(prefix).replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 4) return null;

  const [root, courseFolder, year, lessonFolder] = parts;
  const lesson = parseLessonFolderName(lessonFolder);
  if (root !== "Μαθήματα" || !/^\d{4}$/.test(year) || !lesson) return null;

  return {
    courseFolder,
    year,
    lesson,
    prefix: `Μαθήματα/${courseFolder}/${year}/`,
    lessonPrefix: `${trimmed}/`,
  };
}

function lessonDatesKey(courseFolder: string, year: string) {
  return `Μαθήματα/${courseFolder}/${year}/${LESSON_DATES_FILENAME}`;
}

function sanitizeLessonDateMap(raw: unknown): LessonDateMap {
  if (!raw || typeof raw !== "object") return {};

  const out: LessonDateMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const lesson = normalizeLessonNumber(key);
    const date = typeof value === "string" ? value.trim() : "";
    if (!lesson || !isIsoLessonDate(date)) continue;
    out[lesson] = date;
  }
  return out;
}

export async function getLessonDateMap(courseFolder: string, year: string): Promise<LessonDateMap> {
  if (!BUCKET) return {};

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: lessonDatesKey(courseFolder, year),
      })
    );

    const raw = await res.Body?.transformToString();
    if (!raw) return {};
    return sanitizeLessonDateMap(JSON.parse(raw));
  } catch (err: any) {
    const code = err?.name || err?.Code || err?.code;
    if (code === "NoSuchKey" || code === "NotFound") return {};
    console.error("LESSON_DATES_READ_ERROR:", err);
    return {};
  }
}

export async function getLessonDateMapForParentPrefix(prefix: string) {
  const parsed = parseMaterialLessonParentPrefix(prefix);
  if (!parsed) return {};
  return getLessonDateMap(parsed.courseFolder, parsed.year);
}

export async function saveLessonDateForPrefix(prefix: string, date: string) {
  const parsed = parseMaterialLessonFolderPrefix(prefix);
  if (!parsed) {
    throw new Error("Μη έγκυρος φάκελος μαθήματος.");
  }

  if (!BUCKET) return;

  const dates = await getLessonDateMap(parsed.courseFolder, parsed.year);
  if (date) {
    dates[parsed.lesson] = date;
  } else {
    delete dates[parsed.lesson];
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: lessonDatesKey(parsed.courseFolder, parsed.year),
      ContentType: "application/json",
      Body: JSON.stringify(dates, null, 2),
    })
  );
}
