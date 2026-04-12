import GalleryPageContent from "@/app/gallery/GalleryPageContent";
import { buildGalleryPrefixFromParts } from "@/lib/galleryNavigation";

export default async function GalleryFolderPage({
  params,
}: {
  params: Promise<{ parts?: string[] }>;
}) {
  const { parts } = await params;
  const prefix = buildGalleryPrefixFromParts(parts);

  return <GalleryPageContent prefix={prefix} />;
}
