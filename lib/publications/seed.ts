import booksData from "@/data/ekdoseis/books.json";
import comicsFramesData from "@/data/ekdoseis/comics-frames.json";
import { publicationManifestSchema } from "@/lib/publications/schema";
import type {
  ComicFrame,
  ComicReaderData,
  PublicationAudience,
  PublicationManifest,
} from "@/lib/publications/types";

type RawBook = {
  order: number;
  id: string;
  edition_number: number;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  series: string;
  pages: number | null;
  formats: string[];
  description: string;
  images: Record<string, string>;
};

type RawBooksData = {
  audiences: PublicationManifest["audiences"];
  series: Record<string, { name: string; color: string }>;
  image_slots: Record<string, string>;
  books: RawBook[];
};

type RawComicData = Record<
  string,
  {
    bookTitle: string;
    pages: {
      title: string;
      image: string;
      width: number;
      height: number;
      frames: number[][];
    }[];
  }
>;

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

const subscriberCatalogSlugs = new Set([
  "21-spoydi-sto-theoritiko-avraam-eythymiadi",
  "22-spoydi-sto-theoritiko-ioannoy-d-margazioti",
]);

export function slugifyGreek(value: string) {
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
    .replace(/-{2,}/g, "");
}

export function publicationSlug(
  title: string,
  editionNumber: number | null,
) {
  const titleSlug = slugifyGreek(title) || "ekdosi";
  return editionNumber
    ? `${String(editionNumber).padStart(2, "0")}-${titleSlug}`
    : titleSlug;
}

function localPublicationAsset(path: string) {
  return `/ekdoseis/${path.replace(/^\/+/, "")}`;
}

function normalizeComicReader(
  data: RawComicData[string] | undefined,
): ComicReaderData | undefined {
  if (!data) return undefined;
  return {
    bookTitle: data.bookTitle,
    pages: data.pages.map((page) => ({
      title: page.title,
      image: localPublicationAsset(page.image),
      width: page.width,
      height: page.height,
      frames: page.frames.map(
        (frame) => frame as ComicFrame,
      ),
    })),
  };
}

export function buildSeedPublicationManifest(): PublicationManifest {
  const rawCatalog = booksData as RawBooksData;
  const rawComics = comicsFramesData as RawComicData;
  const timestamp = "2026-01-01T00:00:00.000Z";

  const manifest: PublicationManifest = {
    schemaVersion: 1,
    revision: 0,
    audiences: rawCatalog.audiences,
    series: Object.entries(rawCatalog.series).map(
      ([id, series], index) => ({
        id,
        name: series.name,
        color: series.color,
        order: index + 1,
      }),
    ),
    publications: rawCatalog.books.map((book) => {
      const slug = publicationSlug(
        book.title,
        book.edition_number,
      );
      return {
        id: book.id,
        slug,
        order: book.order,
        editionNumber: book.edition_number,
        title: book.title,
        subtitle: book.subtitle,
        audience: book.audience,
        seriesId: book.series,
        pages: book.pages,
        formats: [...book.formats],
        description: book.description,
        status: "published" as const,
        catalogVisibility: subscriberCatalogSlugs.has(slug)
          ? ("authenticated" as const)
          : ("public" as const),
        routeAccess: "public" as const,
        landscapeCover: book.id === "wfq3ecli6wum5ebncvnm",
        media: Object.entries(book.images).map(
          ([slot, path]) => ({
            id: slot,
            label: rawCatalog.image_slots[slot] || slot,
            url: localPublicationAsset(path),
            storage: "local" as const,
          }),
        ),
        files: [],
        comicReader: normalizeComicReader(rawComics[book.id]),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }),
    updatedAt: timestamp,
  };

  return publicationManifestSchema.parse(manifest);
}
