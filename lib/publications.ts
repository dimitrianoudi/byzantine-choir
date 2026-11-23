import booksData from "@/data/ekdoseis/books.json";
import comicsFramesData from "@/data/ekdoseis/comics-frames.json";

export type PublicationAudience = "adult" | "kids";
export type PublicationImageSlot =
  | "cover"
  | "back"
  | "toc"
  | "sample"
  | "sample2";

export type PublicationSeries = {
  id: string;
  name: string;
  color: string;
};

export type Publication = {
  order: number;
  id: string;
  slug: string;
  editionNumber: number;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  series: string;
  seriesName: string;
  seriesColor: string;
  pages: number | null;
  formats: string[];
  description: string;
  images: Partial<Record<PublicationImageSlot, string>>;
  hasFrameReader: boolean;
  landscapeCover: boolean;
};

export type ComicFrame = [x: number, y: number, width: number, height: number];

export type ComicPage = {
  title: string;
  image: string;
  width: number;
  height: number;
  frames: ComicFrame[];
};

export type ComicReaderData = {
  bookTitle: string;
  pages: ComicPage[];
};

type RawBook = {
  order: number;
  id: string;
  edition_number: number;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  series: string;
  series_name: string;
  pages: number | null;
  formats: string[];
  description: string;
  images: Partial<Record<PublicationImageSlot, string>>;
  has_frame_reader: boolean;
};

type RawBooksData = {
  audiences: Record<
    PublicationAudience,
    { title: string; subtitle: string }
  >;
  series: Record<string, { name: string; color: string }>;
  image_slots: Record<PublicationImageSlot, string>;
  books: RawBook[];
};

type RawComicReaderData = {
  bookTitle: string;
  pages: {
    title: string;
    image: string;
    width: number;
    height: number;
    frames: number[][];
  }[];
};

const rawCatalog = booksData as RawBooksData;
const rawComics = comicsFramesData as Record<string, RawComicReaderData>;

const GREEK_TO_LATIN: Record<string, string> = {
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};

function slugifyGreek(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("el-GR");
  const transliterated = Array.from(normalized)
    .map((character) => GREEK_TO_LATIN[character] ?? character)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function publicationSlug(book: RawBook) {
  const edition = String(book.edition_number).padStart(2, "0");
  return `${edition}-${slugifyGreek(book.title)}`;
}

function publicAssetPath(path: string) {
  return `/ekdoseis/${path.replace(/^\/+/, "")}`;
}

function normalizePublication(book: RawBook): Publication {
  const series = rawCatalog.series[book.series];
  if (!series) {
    throw new Error(`Unknown publication series "${book.series}" for ${book.id}`);
  }

  return {
    order: book.order,
    id: book.id,
    slug: publicationSlug(book),
    editionNumber: book.edition_number,
    title: book.title,
    subtitle: book.subtitle,
    audience: book.audience,
    series: book.series,
    seriesName: book.series_name,
    seriesColor: series.color,
    pages: book.pages,
    formats: [...book.formats],
    description: book.description,
    images: Object.fromEntries(
      Object.entries(book.images).map(([slot, path]) => [
        slot,
        publicAssetPath(path),
      ]),
    ),
    hasFrameReader: book.has_frame_reader,
    landscapeCover: book.id === "wfq3ecli6wum5ebncvnm",
  };
}

function normalizeComicReader(data: RawComicReaderData): ComicReaderData {
  return {
    bookTitle: data.bookTitle,
    pages: data.pages.map((page) => ({
      title: page.title,
      image: publicAssetPath(page.image),
      width: page.width,
      height: page.height,
      frames: page.frames.map((frame) => {
        if (
          frame.length !== 4 ||
          frame.some((value) => !Number.isFinite(value) || value < 0)
        ) {
          throw new Error(`Invalid comic frame in "${data.bookTitle}"`);
        }
        return frame as ComicFrame;
      }),
    })),
  };
}

export const publicationAudiences = rawCatalog.audiences;
export const publicationImageLabels = rawCatalog.image_slots;

export const publicationSeries: PublicationSeries[] = Object.entries(
  rawCatalog.series,
).map(([id, series]) => ({
  id,
  name: series.name,
  color: series.color,
}));

export const publications: Publication[] = rawCatalog.books
  .map(normalizePublication)
  .sort((left, right) => left.order - right.order);

export const comicReaders: Record<string, ComicReaderData> = Object.fromEntries(
  Object.entries(rawComics).map(([bookId, data]) => [
    bookId,
    normalizeComicReader(data),
  ]),
);

if (publications.length !== 35) {
  throw new Error(
    `Expected 35 publications, received ${publications.length}`,
  );
}

const uniqueSlugs = new Set(publications.map((publication) => publication.slug));
if (uniqueSlugs.size !== publications.length) {
  throw new Error("Publication slugs must be unique");
}

for (const publication of publications) {
  if (!publication.images.cover) {
    throw new Error(`Missing publication cover for ${publication.id}`);
  }
  if (publication.hasFrameReader && !comicReaders[publication.id]) {
    throw new Error(`Missing comic reader data for ${publication.id}`);
  }
}

export function getPublicationBySlug(slug: string) {
  return (
    publications.find((publication) => publication.slug === slug) || null
  );
}

export function getComicReader(publicationId: string) {
  return comicReaders[publicationId] || null;
}

export function publicationPath(publication: Publication) {
  return `/ekdoseis/${publication.slug}`;
}

