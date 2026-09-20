import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/typiko", changeFrequency: "weekly", priority: 0.9 },
  { path: "/calendar", changeFrequency: "monthly", priority: 0.9 },
  { path: "/akolouthies", changeFrequency: "weekly", priority: 0.8 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
  { path: "/live", changeFrequency: "weekly", priority: 0.7 },
  { path: "/register", changeFrequency: "monthly", priority: 0.7 },
  { path: "/register/kids", changeFrequency: "monthly", priority: 0.6 },
  { path: "/register/adults", changeFrequency: "monthly", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
