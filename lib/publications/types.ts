export type PublicationAudience = "adult" | "kids";
export type PublicationStatus = "draft" | "published" | "archived";
export type PublicationVisibility = "public" | "authenticated";
export type PublicationFileAccess =
  | "public"
  | "authenticated"
  | "hidden";

export type PublicationAudienceConfig = {
  title: string;
  subtitle: string;
};

export type PublicationSeriesRecord = {
  id: string;
  name: string;
  color: string;
  order: number;
};

export type PublicationMediaRecord = {
  id: string;
  label: string;
  url: string;
  storage: "local" | "cloudinary";
  publicId?: string;
  width?: number;
  height?: number;
};

export type PublicationFileRecord = {
  id: string;
  name: string;
  format: string;
  mime: string;
  key: string;
  size?: number;
  access: PublicationFileAccess;
};

export type ComicFrame = [
  x: number,
  y: number,
  width: number,
  height: number,
];

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

export type PublicationRecord = {
  id: string;
  slug: string;
  order: number;
  editionNumber: number | null;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  seriesId: string;
  pages: number | null;
  formats: string[];
  description: string;
  status: PublicationStatus;
  catalogVisibility: PublicationVisibility;
  routeAccess: PublicationVisibility;
  landscapeCover: boolean;
  media: PublicationMediaRecord[];
  files: PublicationFileRecord[];
  comicReader?: ComicReaderData;
  createdAt: string;
  updatedAt: string;
};

export type PublicationManifest = {
  schemaVersion: 1;
  revision: number;
  audiences: Record<
    PublicationAudience,
    PublicationAudienceConfig
  >;
  series: PublicationSeriesRecord[];
  publications: PublicationRecord[];
  updatedAt: string;
};

export type StoredPublicationManifest = {
  manifest: PublicationManifest;
  etag: string | null;
  source: "s3" | "seed";
};
