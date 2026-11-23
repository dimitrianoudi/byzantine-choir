import { getPublicationManifest } from "@/lib/publications/repository";
import type {
  ComicFrame,
  ComicPage,
  ComicReaderData,
  PublicationAudience,
  PublicationFileRecord,
  PublicationMediaRecord,
  PublicationRecord,
  PublicationSeriesRecord,
} from "@/lib/publications/types";

export type {
  ComicFrame,
  ComicPage,
  ComicReaderData,
  PublicationAudience,
  PublicationFileRecord,
  PublicationMediaRecord,
};

export type PublicationSeries = {
  id: string;
  name: string;
  color: string;
};

export type Publication = {
  order: number;
  id: string;
  slug: string;
  editionNumber: number | null;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  series: string;
  seriesName: string;
  seriesColor: string;
  pages: number | null;
  formats: string[];
  description: string;
  status: PublicationRecord["status"];
  catalogVisibility: PublicationRecord["catalogVisibility"];
  routeAccess: PublicationRecord["routeAccess"];
  media: PublicationMediaRecord[];
  images: Record<string, string>;
  files: PublicationFileRecord[];
  comicReader?: ComicReaderData;
  landscapeCover: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicationCatalog = {
  revision: number;
  audiences: Record<
    PublicationAudience,
    { title: string; subtitle: string }
  >;
  series: PublicationSeries[];
  publications: Publication[];
};

function normalizePublication(
  publication: PublicationRecord,
  series: PublicationSeriesRecord,
): Publication {
  return {
    order: publication.order,
    id: publication.id,
    slug: publication.slug,
    editionNumber: publication.editionNumber,
    title: publication.title,
    subtitle: publication.subtitle,
    audience: publication.audience,
    series: publication.seriesId,
    seriesName: series.name,
    seriesColor: series.color,
    pages: publication.pages,
    formats: [...publication.formats],
    description: publication.description,
    status: publication.status,
    catalogVisibility: publication.catalogVisibility,
    routeAccess: publication.routeAccess,
    media: publication.media.map((item) => ({ ...item })),
    images: Object.fromEntries(
      publication.media.map((item) => [item.id, item.url]),
    ),
    files: publication.files.map((item) => ({ ...item })),
    comicReader: publication.comicReader,
    landscapeCover: publication.landscapeCover,
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
  };
}

export async function getPublicationCatalog(): Promise<PublicationCatalog> {
  const manifest = await getPublicationManifest();
  const seriesById = new Map(
    manifest.series.map((series) => [series.id, series]),
  );
  const publications = manifest.publications
    .map((publication) => {
      const series = seriesById.get(publication.seriesId);
      if (!series) {
        throw new Error(
          `Unknown publication series "${publication.seriesId}"`,
        );
      }
      return normalizePublication(publication, series);
    })
    .sort((left, right) => left.order - right.order);

  return {
    revision: manifest.revision,
    audiences: manifest.audiences,
    series: manifest.series
      .slice()
      .sort((left, right) => left.order - right.order)
      .map(({ id, name, color }) => ({ id, name, color })),
    publications,
  };
}

export async function getPublicationBySlug(slug: string) {
  const { publications } = await getPublicationCatalog();
  return (
    publications.find((publication) => publication.slug === slug) ||
    null
  );
}

export async function getPublicationById(id: string) {
  const { publications } = await getPublicationCatalog();
  return (
    publications.find((publication) => publication.id === id) ||
    null
  );
}

export function publicationPath(
  publication: Pick<Publication, "slug">,
) {
  return `/ekdoseis/${publication.slug}`;
}
