import type { MetadataRoute } from "next";
import {
  getPublicationCatalog,
  publicationPath,
} from "@/lib/publications";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/typiko", changeFrequency: "weekly", priority: 0.9 },
  { path: "/calendar", changeFrequency: "monthly", priority: 0.9 },
  { path: "/akolouthies", changeFrequency: "weekly", priority: 0.8 },
  { path: "/ekdoseis", changeFrequency: "monthly", priority: 0.8 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
  { path: "/live", changeFrequency: "weekly", priority: 0.7 },
  { path: "/register", changeFrequency: "monthly", priority: 0.7 },
  { path: "/register/kids", changeFrequency: "monthly", priority: 0.6 },
  { path: "/register/adults", changeFrequency: "monthly", priority: 0.6 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getPublicationCatalog();
  const routes = publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const publicationRoutes = catalog.publications
    .filter(
      (publication) =>
        publication.status === "published" &&
        publication.routeAccess === "public",
    )
    .map((publication) => ({
      url: absoluteUrl(publicationPath(publication)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...routes, ...publicationRoutes];
}
