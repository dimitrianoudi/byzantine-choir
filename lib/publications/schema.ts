import { z } from "zod";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

const publicationUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("https://"),
    "Expected a local or HTTPS URL",
  );

export const publicationAudienceSchema = z.enum([
  "adult",
  "kids",
]);
export const publicationStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);
export const publicationVisibilitySchema = z.enum([
  "public",
  "authenticated",
]);
export const publicationFileAccessSchema = z.enum([
  "public",
  "authenticated",
  "hidden",
]);

export const publicationSeriesSchema = z.object({
  id: z.string().trim().regex(idPattern),
  name: z.string().trim().min(2).max(160),
  color: z.string().trim().regex(hexColorPattern),
  order: z.number().int().min(0).max(10_000),
});

export const publicationMediaSchema = z.object({
  id: z.string().trim().regex(idPattern),
  label: z.string().trim().min(1).max(120),
  url: publicationUrlSchema,
  storage: z.enum(["local", "cloudinary"]),
  publicId: z.string().trim().min(1).max(500).optional(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

export const publicationFileSchema = z.object({
  id: z.string().trim().regex(idPattern),
  name: z.string().trim().min(1).max(240),
  format: z.string().trim().min(1).max(40),
  mime: z.string().trim().min(3).max(160),
  key: z.string().trim().min(1).max(1000),
  size: z.number().int().nonnegative().max(500_000_000).optional(),
  access: publicationFileAccessSchema,
});

const comicFrameSchema = z.tuple([
  z.number().nonnegative(),
  z.number().nonnegative(),
  z.number().positive(),
  z.number().positive(),
]);

const comicPageSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    image: publicationUrlSchema,
    width: z.number().int().positive().max(20_000),
    height: z.number().int().positive().max(20_000),
    frames: z.array(comicFrameSchema).min(1).max(100),
  })
  .superRefine((page, context) => {
    page.frames.forEach(([x, y, width, height], index) => {
      if (x + width > page.width || y + height > page.height) {
        context.addIssue({
          code: "custom",
          path: ["frames", index],
          message: "Comic frame exceeds page bounds",
        });
      }
    });
  });

export const comicReaderSchema = z.object({
  bookTitle: z.string().trim().min(1).max(240),
  pages: z.array(comicPageSchema).min(1).max(500),
});

export const publicationRecordSchema = z
  .object({
    id: z.string().trim().regex(idPattern),
    slug: z.string().trim().regex(slugPattern).max(240),
    order: z.number().int().min(0).max(100_000),
    editionNumber: z.number().int().positive().max(100_000).nullable(),
    title: z.string().trim().min(2).max(300),
    subtitle: z.string().trim().max(500),
    audience: publicationAudienceSchema,
    seriesId: z.string().trim().regex(idPattern),
    pages: z.number().int().positive().max(100_000).nullable(),
    formats: z.array(z.string().trim().min(1).max(40)).max(20),
    description: z.string().trim().max(20_000),
    status: publicationStatusSchema,
    catalogVisibility: publicationVisibilitySchema,
    routeAccess: publicationVisibilitySchema,
    landscapeCover: z.boolean(),
    media: z.array(publicationMediaSchema).max(100),
    files: z.array(publicationFileSchema).max(50),
    comicReader: comicReaderSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((publication, context) => {
    if (
      publication.status === "published" &&
      !publication.media.some((item) => item.id === "cover")
    ) {
      context.addIssue({
        code: "custom",
        path: ["media"],
        message: "Every publication needs cover media",
      });
    }
    if (
      publication.status === "published" &&
      publication.description.length < 10
    ) {
      context.addIssue({
        code: "custom",
        path: ["description"],
        message: "Published publications need a description",
      });
    }

    for (const [path, values] of [
      ["media", publication.media.map((item) => item.id)],
      ["files", publication.files.map((item) => item.id)],
    ] as const) {
      if (new Set(values.map(String)).size !== values.length) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `Duplicate ${path} IDs`,
        });
      }
    }
  });

export const publicationManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    audiences: z.object({
      adult: z.object({
        title: z.string().trim().min(2).max(160),
        subtitle: z.string().trim().max(240),
      }),
      kids: z.object({
        title: z.string().trim().min(2).max(160),
        subtitle: z.string().trim().max(240),
      }),
    }),
    series: z.array(publicationSeriesSchema).min(1).max(100),
    publications: z.array(publicationRecordSchema).max(10_000),
    updatedAt: z.string().datetime(),
  })
  .superRefine((manifest, context) => {
    const seriesIds = manifest.series.map((item) => item.id);
    const publicationIds = manifest.publications.map(
      (item) => item.id,
    );
    const slugs = manifest.publications.map((item) => item.slug);
    const orders = manifest.publications.map((item) => item.order);

    for (const [path, values] of [
      ["series", seriesIds],
      ["publications", publicationIds],
      ["publications", slugs],
      ["publications", orders],
    ] as const) {
      if (new Set(values.map(String)).size !== values.length) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `Duplicate values in ${path}`,
        });
      }
    }

    const knownSeries = new Set(seriesIds);
    manifest.publications.forEach((publication, index) => {
      if (!knownSeries.has(publication.seriesId)) {
        context.addIssue({
          code: "custom",
          path: ["publications", index, "seriesId"],
          message: `Unknown series ${publication.seriesId}`,
        });
      }
    });
  });
