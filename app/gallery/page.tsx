import type { Metadata } from "next";
import GalleryPageContent from "@/app/gallery/GalleryPageContent";

export const metadata: Metadata = {
  title: "Στιγμιότυπα | Ψαλτική Παιδεία",
  description:
    "Φωτογραφικά στιγμιότυπα από τα μαθήματα, τις πρόβες και τις δράσεις του Φροντιστηρίου Ψαλτικής.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  return <GalleryPageContent />;
}