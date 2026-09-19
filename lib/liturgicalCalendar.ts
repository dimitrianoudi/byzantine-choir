const CALENDAR_URL =
  "https://prosefchi.github.io/prosefchi/calendar.el.gregorian.json";

const GREEK_DATE_FORMATTER = new Intl.DateTimeFormat("el-GR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ATHENS_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Athens",
});

const TONE_NAMES = [
  "",
  "Α΄",
  "Β΄",
  "Γ΄",
  "Δ΄",
  "πλ. α΄",
  "πλ. β΄",
  "Βαρύς",
  "πλ. δ΄",
] as const;

const EOTHINON_NAMES = [
  "",
  "Α΄",
  "Β΄",
  "Γ΄",
  "Δ΄",
  "Ε΄",
  "ΣΤ΄",
  "Ζ΄",
  "Η΄",
  "Θ΄",
  "Ι΄",
  "ΙΑ΄",
] as const;

type CalendarDay = {
  title: string | null;
  saints: string[];
  tone: number | null;
  matinsReference: string | null;
};

export type LiturgicalSunday = {
  isoDate: string;
  formattedDate: string;
  tone: string | null;
  eothinon: string | null;
  feastTitle: string | null;
  commemorations: string[];
  sourceAvailable: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getAthensCalendarDate(now: Date) {
  const parts = ATHENS_DATE_FORMATTER.formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );
}

export function getUpcomingSunday(now = new Date()) {
  const today = getAthensCalendarDate(now);
  const daysUntilSunday = modulo(7 - today.getUTCDay(), 7);
  return addDays(today, daysUntilSunday);
}

function getOrthodoxPascha(year: number) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const gregorianOffset =
    Math.floor(year / 100) - Math.floor(year / 400) - 2;

  return addDays(
    new Date(Date.UTC(year, julianMonth - 1, julianDay)),
    gregorianOffset,
  );
}

function isSameDate(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function isSpecialSunday(date: Date) {
  const pascha = getOrthodoxPascha(date.getUTCFullYear());

  return (
    isSameDate(date, addDays(pascha, -7)) ||
    isSameDate(date, pascha) ||
    isSameDate(date, addDays(pascha, 49))
  );
}

function calculateTone(date: Date) {
  if (isSpecialSunday(date)) return null;

  let thomasSunday = addDays(getOrthodoxPascha(date.getUTCFullYear()), 7);
  if (date < thomasSunday) {
    thomasSunday = addDays(
      getOrthodoxPascha(date.getUTCFullYear() - 1),
      7,
    );
  }

  const weeksSinceThomas = Math.floor(daysBetween(thomasSunday, date) / 7);
  return modulo(weeksSinceThomas, 8) + 1;
}

function calculateEothinon(date: Date) {
  if (isSpecialSunday(date)) return null;

  const year = date.getUTCFullYear();
  const pascha = getOrthodoxPascha(year);
  const paschaDistance = daysBetween(pascha, date);
  const paschalEothina = new Map<number, number>([
    [7, 1],
    [14, 4],
    [21, 5],
    [28, 7],
    [35, 8],
    [42, 10],
    [56, 1],
  ]);

  if (paschalEothina.has(paschaDistance)) {
    return paschalEothina.get(paschaDistance) ?? null;
  }

  let allSaintsSunday = addDays(pascha, 56);
  if (date < allSaintsSunday) {
    allSaintsSunday = addDays(getOrthodoxPascha(year - 1), 56);
  }

  const weeksSinceAllSaints = Math.floor(
    daysBetween(allSaintsSunday, date) / 7,
  );
  return modulo(weeksSinceAllSaints, 11) + 1;
}

function getEothinonFromReference(reference: string) {
  const compactReference = reference.replace(/\s+/g, "");
  const references: Array<[string, number]> = [
    ["28:16-20", 1],
    ["16:1-8", 2],
    ["16:9-20", 3],
    ["24:1-12", 4],
    ["24:12-35", 5],
    ["24:36-53", 6],
    ["20:1-10", 7],
    ["20:11-18", 8],
    ["20:19-31", 9],
    ["21:1-14", 10],
    ["21:14-25", 11],
    ["21:15-25", 11],
  ];

  return (
    references.find(([passage]) => compactReference.includes(passage))?.[1] ??
    null
  );
}

function parseCalendarDay(payload: unknown, isoDate: string): CalendarDay | null {
  if (!isRecord(payload) || !isRecord(payload.days)) return null;

  const rawDay = payload.days[isoDate];
  if (!isRecord(rawDay)) return null;

  const rawMatins = rawDay.matinsGospel;
  const title = typeof rawDay.title === "string" ? rawDay.title.trim() : null;
  const saints = Array.isArray(rawDay.saints)
    ? rawDay.saints.filter(
        (saint): saint is string =>
          typeof saint === "string" && saint.trim().length > 0,
      )
    : [];
  const tone =
    typeof rawDay.tone === "number" &&
    Number.isInteger(rawDay.tone) &&
    rawDay.tone >= 1 &&
    rawDay.tone <= 8
      ? rawDay.tone
      : null;
  const matinsReference =
    isRecord(rawMatins) && typeof rawMatins.reference === "string"
      ? rawMatins.reference
      : null;

  return { title, saints, tone, matinsReference };
}

async function fetchCalendarDay(isoDate: string) {
  try {
    const response = await fetch(CALENDAR_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 21_600 },
    });

    if (!response.ok) return null;
    return parseCalendarDay(await response.json(), isoDate);
  } catch {
    return null;
  }
}

function uniqueCommemorations(day: CalendarDay | null) {
  if (!day) return [];

  const seen = new Set<string>();
  const title = day.title?.toLocaleLowerCase("el-GR");

  return day.saints.filter((saint) => {
    const normalized = saint.trim().toLocaleLowerCase("el-GR");
    if (!normalized || normalized === title || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export async function getUpcomingLiturgicalSunday(
  now = new Date(),
): Promise<LiturgicalSunday> {
  const date = getUpcomingSunday(now);
  const isoDate = dateKey(date);
  const day = await fetchCalendarDay(isoDate);
  const toneNumber = day?.tone ?? calculateTone(date);
  const eothinonNumber = isSpecialSunday(date)
    ? null
    : day?.matinsReference
      ? getEothinonFromReference(day.matinsReference)
      : calculateEothinon(date);

  return {
    isoDate,
    formattedDate: GREEK_DATE_FORMATTER.format(date),
    tone: toneNumber ? TONE_NAMES[toneNumber] : null,
    eothinon: eothinonNumber ? EOTHINON_NAMES[eothinonNumber] : null,
    feastTitle: day?.title ?? null,
    commemorations: uniqueCommemorations(day),
    sourceAvailable: day !== null,
  };
}
