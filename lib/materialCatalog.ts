export type MaterialCourseSlug = "kids" | "women" | "men";
export type MaterialScheduleDay = "monday" | "wednesday";

export type MaterialGroup = {
  slug: string;
  folder: string;
  day: MaterialScheduleDay;
};

export type MaterialYearOption = {
  id: string;
  folder: string;
  label: string;
  lessonCount: number;
  grouped: boolean;
};

export const MATERIAL_COURSES: {
  slug: MaterialCourseSlug;
  folder: string;
  groups: MaterialGroup[];
}[] = [
  {
    slug: "kids",
    folder: "Ψαλτική παιδικής φωνής",
    groups: [
      { slug: "p1", folder: "Π1 - Αρχάριο παιδιών", day: "monday" },
      { slug: "p2", folder: "Π2 - Β παιδιών", day: "wednesday" },
    ],
  },
  {
    slug: "women",
    folder: "Ψαλτική γυναικείας φωνής",
    groups: [
      { slug: "g1", folder: "Γ1 - Αρχάριο γυναικών", day: "monday" },
      { slug: "g2", folder: "Γ2 - Β Γυναικών", day: "monday" },
    ],
  },
  {
    slug: "men",
    folder: "Ψαλτική ανδρικής φωνής",
    groups: [
      { slug: "a1", folder: "Α1 - Αρχάριων αντρών", day: "monday" },
      { slug: "b1", folder: "Β1 - Β Αντρών", day: "wednesday" },
      { slug: "b2", folder: "Β2 - Ταχύρυθμο αντρών", day: "wednesday" },
    ],
  },
];

const ACADEMIC_YEAR_ID = "2026-2027";
const ACADEMIC_YEAR_FOLDER = "Έτος 2026-2027";

const NO_LESSON_DATES = new Set([
  "2026-10-26",
  "2026-10-28",
  "2026-12-28",
  "2026-12-30",
  "2027-01-04",
  "2027-01-06",
  "2027-03-15",
  "2027-03-24",
  "2027-04-26",
  "2027-04-28",
  "2027-05-03",
  "2027-05-05",
]);

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildLessonDates(day: MaterialScheduleDay) {
  const weekday = day === "monday" ? 1 : 3;
  const start = new Date(Date.UTC(2026, 9, 5));
  const end = new Date(Date.UTC(2027, 5, 16));
  const dates: string[] = [];

  for (
    const current = new Date(start);
    current <= end;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const date = isoDate(current);
    if (current.getUTCDay() === weekday && !NO_LESSON_DATES.has(date)) {
      dates.push(date);
    }
  }

  return dates;
}

const LESSON_DATES_BY_DAY: Record<MaterialScheduleDay, string[]> = {
  monday: buildLessonDates("monday"),
  wednesday: buildLessonDates("wednesday"),
};

export const MATERIAL_YEAR_OPTIONS: MaterialYearOption[] = [
  { id: "2025", folder: "2025", label: "2025", lessonCount: 30, grouped: false },
  { id: "2026", folder: "2026", label: "2026", lessonCount: 33, grouped: false },
  {
    id: ACADEMIC_YEAR_ID,
    folder: ACADEMIC_YEAR_FOLDER,
    label: "Έτος 2026–2027",
    lessonCount: LESSON_DATES_BY_DAY.monday.length,
    grouped: true,
  },
];

export function getMaterialCourse(value: string) {
  return MATERIAL_COURSES.find(
    (course) => course.slug === value || course.folder === value
  ) || null;
}

export function getMaterialYear(value: string) {
  const configured = MATERIAL_YEAR_OPTIONS.find(
    (year) => year.id === value || year.folder === value
  );
  if (configured) return configured;

  if (/^\d{4}$/.test(value)) {
    return {
      id: value,
      folder: value,
      label: value,
      lessonCount: 99,
      grouped: false,
    } satisfies MaterialYearOption;
  }

  return null;
}

export function getMaterialGroups(courseSlug: MaterialCourseSlug, yearId: string) {
  const year = getMaterialYear(yearId);
  if (!year?.grouped) return [];
  return getMaterialCourse(courseSlug)?.groups || [];
}

export function getMaterialGroup(
  courseSlug: MaterialCourseSlug,
  yearId: string,
  value?: string
) {
  if (!value) return null;
  return (
    getMaterialGroups(courseSlug, yearId).find(
      (group) => group.slug === value || group.folder === value
    ) || null
  );
}

export function getMaterialLessonCount(
  courseSlug: MaterialCourseSlug,
  yearId: string,
  groupSlug?: string
) {
  const year = getMaterialYear(yearId);
  if (!year) return 0;
  if (!year.grouped) return year.lessonCount;

  const group = getMaterialGroup(courseSlug, year.id, groupSlug);
  return group ? LESSON_DATES_BY_DAY[group.day].length : 0;
}

export function getMaterialLessonDate(
  courseSlug: MaterialCourseSlug,
  yearId: string,
  groupSlug: string | undefined,
  lesson: number | string
) {
  const year = getMaterialYear(yearId);
  const group = year?.grouped
    ? getMaterialGroup(courseSlug, year.id, groupSlug)
    : null;
  const lessonNumber = Number(lesson);

  if (
    !year?.grouped ||
    !group ||
    !Number.isInteger(lessonNumber) ||
    lessonNumber < 1
  ) {
    return "";
  }

  return LESSON_DATES_BY_DAY[group.day][lessonNumber - 1] || "";
}

export function buildMaterialLessonPrefix(
  courseSlug: MaterialCourseSlug,
  yearId: string,
  lesson: number | string,
  groupSlug?: string
) {
  const course = getMaterialCourse(courseSlug);
  const year = getMaterialYear(yearId);
  const lessonNumber = Number(lesson);

  if (
    !course ||
    !year ||
    !Number.isInteger(lessonNumber) ||
    lessonNumber < 1 ||
    lessonNumber > (year.grouped ? year.lessonCount : 99)
  ) {
    return null;
  }

  const lessonFolder = `Μάθημα ${String(lessonNumber).padStart(2, "0")}`;
  if (!year.grouped) {
    if (groupSlug) return null;
    return `Μαθήματα/${course.folder}/${year.folder}/${lessonFolder}/`;
  }

  const group = getMaterialGroup(course.slug, year.id, groupSlug);
  if (!group || lessonNumber > LESSON_DATES_BY_DAY[group.day].length) {
    return null;
  }

  return `Μαθήματα/${course.folder}/${year.folder}/${group.folder}/${lessonFolder}/`;
}

export function getConfiguredMaterialChildPrefixes(prefix: string) {
  const normalized = prefix.replace(/^\/+|\/+$/g, "");
  const parts = normalized ? normalized.split("/").filter(Boolean) : [];

  if (parts.length === 0) return ["Μαθήματα/"];

  if (parts.length === 1 && parts[0] === "Μαθήματα") {
    return MATERIAL_COURSES.map((course) => `Μαθήματα/${course.folder}/`);
  }

  if (parts[0] !== "Μαθήματα") return [];

  const course = parts[1] ? getMaterialCourse(parts[1]) : null;
  if (!course) return [];

  if (parts.length === 2) {
    return [`Μαθήματα/${course.folder}/${ACADEMIC_YEAR_FOLDER}/`];
  }

  const year = parts[2] ? getMaterialYear(parts[2]) : null;
  if (!year?.grouped || year.id !== ACADEMIC_YEAR_ID) return [];

  if (parts.length === 3) {
    return course.groups.map(
      (group) => `Μαθήματα/${course.folder}/${year.folder}/${group.folder}/`
    );
  }

  const group = parts[3] ? getMaterialGroup(course.slug, year.id, parts[3]) : null;
  if (!group || parts.length !== 4) return [];

  return LESSON_DATES_BY_DAY[group.day].map(
    (_, index) =>
      `Μαθήματα/${course.folder}/${year.folder}/${group.folder}/Μάθημα ${String(
        index + 1
      ).padStart(2, "0")}/`
  );
}
