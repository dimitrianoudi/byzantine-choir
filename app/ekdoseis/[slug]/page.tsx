import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ComicFrameReader from "@/components/ekdoseis/ComicFrameReader";
import PublicationInterestForm from "@/components/ekdoseis/PublicationInterestForm";
import PublicationMedia, {
  type PublicationMediaItem,
} from "@/components/ekdoseis/PublicationMedia";
import {
  getPublicationCatalog,
  publicationPath,
} from "@/lib/publications";
import {
  canAccessPublication,
  canDownloadPublicationFile,
} from "@/lib/publications/access";
import { getSession } from "@/lib/session";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function metadataDescription(value: string) {
  if (value.length <= 170) return value;
  return `${value.slice(0, 167).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([
    getPublicationCatalog(),
    getSession(),
  ]);
  const publication = catalog.publications.find(
    (item) => item.slug === slug,
  );
  if (
    !publication ||
    !canAccessPublication(publication, session)
  ) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${publication.title} | Εκδόσεις Ψαλτικής Παιδείας`;
  const description = metadataDescription(publication.description);
  const path = publicationPath(publication);
  const socialImage = `${path}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "el_GR",
      type: "article",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `Εξώφυλλο: ${publication.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [catalog, session] = await Promise.all([
    getPublicationCatalog(),
    getSession(),
  ]);
  const publication = catalog.publications.find(
    (item) => item.slug === slug,
  );
  if (
    !publication ||
    !canAccessPublication(publication, session)
  ) {
    notFound();
  }

  const images: PublicationMediaItem[] = publication.media.map(
    (media) => ({
      slot: media.id,
      src: media.url,
      label: media.label,
    }),
  );
  const availableFiles = publication.files.filter((file) =>
    canDownloadPublicationFile(file, session),
  );
  const path = publicationPath(publication);
  const bookSchema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: publication.title,
    ...(publication.subtitle
      ? { alternativeHeadline: publication.subtitle }
      : {}),
    description: publication.description,
    image: absoluteUrl(publication.images.cover!),
    url: absoluteUrl(path),
    inLanguage: "el",
    ...(publication.pages
      ? { numberOfPages: publication.pages }
      : {}),
    audience: {
      "@type": "PeopleAudience",
      audienceType:
        publication.audience === "kids" ? "Παιδιά" : "Ενήλικες",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: publication.seriesName,
    },
  };

  return (
    <article className="space-y-8 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(bookSchema).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/ekdoseis"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a1e2e] no-underline hover:underline"
      >
        <span aria-hidden="true">←</span>
        Όλες οι εκδόσεις
      </Link>

      <header
        className="overflow-hidden rounded-[1.5rem] border border-[#e3d5bc] bg-[#f6f1e7] p-5 shadow-[0_14px_38px_rgba(67,45,26,0.1)] sm:p-8"
        style={{ borderTopColor: publication.seriesColor, borderTopWidth: 5 }}
      >
        <div className="grid gap-7 md:grid-cols-[minmax(210px,290px)_1fr] md:items-center">
          <div className="mx-auto w-full max-w-[280px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[0.7rem_1.2rem_1.2rem_0.7rem] border border-[#dfd2bb] bg-white shadow-[0_18px_36px_rgba(67,45,26,0.2)]">
              <Image
                src={publication.images.cover!}
                alt={`Εξώφυλλο: ${publication.title}`}
                fill
                priority
                sizes="(max-width: 768px) 280px, 290px"
                className={
                  publication.landscapeCover
                    ? "object-contain p-3"
                    : "object-cover"
                }
              />
            </div>
          </div>

          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: publication.seriesColor }}
            >
              {publication.seriesName}
            </p>
            <h1 className="mt-3 font-heading text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.02] text-[#5a1e2e]">
              {publication.title}
            </h1>
            {publication.subtitle && (
              <p className="mt-3 text-lg leading-relaxed text-[#554f47]">
                {publication.subtitle}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d8c9ad] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a1e2e]">
                {publication.audience === "adult"
                  ? "Για ενήλικες"
                  : "Για παιδιά"}
              </span>
              {publication.pages && (
                <span className="rounded-full border border-[#d8c9ad] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a1e2e]">
                  {publication.pages} σελίδες
                </span>
              )}
              {publication.formats.map((format) => (
                <span
                  key={format}
                  className="rounded-full border border-[#d8c9ad] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a1e2e]"
                >
                  {format}
                </span>
              ))}
            </div>

            <a
              href="#interest"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5a1e2e] px-5 py-2.5 font-semibold text-white no-underline transition hover:bg-[#7a2e40]"
            >
              Ενδιαφέρομαι για αυτή την έκδοση
            </a>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[1.25rem] border border-[#e7ddc8] bg-white p-5 shadow-[0_8px_24px_rgba(67,45,26,0.07)] sm:p-6">
          <h2 className="font-heading text-2xl font-bold text-[#5a1e2e]">
            Σχετικά με την έκδοση
          </h2>
          <p className="mt-4 whitespace-pre-line text-[0.98rem] leading-7 text-[#45413b]">
            {publication.description}
          </p>
        </div>

        <aside className="rounded-[1.25rem] border border-[#e7ddc8] bg-[#fbf8f1] p-5 sm:p-6">
          <h2 className="font-heading text-xl font-bold text-[#5a1e2e]">
            Στοιχεία
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-[#6e665c]">Σειρά</dt>
              <dd className="mt-1 text-[#2b2b2b]">
                {publication.seriesName}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#6e665c]">
                Διαθέσιμες μορφές
              </dt>
              <dd className="mt-1 text-[#2b2b2b]">
                {publication.formats.join(" · ")}
              </dd>
            </div>
            {publication.pages && (
              <div>
                <dt className="font-semibold text-[#6e665c]">Έκταση</dt>
                <dd className="mt-1 text-[#2b2b2b]">
                  {publication.pages} σελίδες
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </section>

      <PublicationMedia title={publication.title} images={images} />

      {availableFiles.length > 0 && (
        <section className="rounded-[1.25rem] border border-[#e7ddc8] bg-[#fbf8f1] p-5 sm:p-6">
          <h2 className="font-heading text-2xl font-bold text-[#5a1e2e]">
            Διαθέσιμα αρχεία
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {availableFiles.map((file) => (
              <a
                key={file.id}
                href={`/api/ekdoseis/${encodeURIComponent(publication.id)}/files/${encodeURIComponent(file.id)}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-[#cdbb98] bg-white px-4 py-2 text-sm font-semibold text-[#5a1e2e] no-underline transition hover:border-[#8a6a2f]"
              >
                {file.name}
                <span className="ml-2 text-xs text-[#8a6a2f]">
                  {file.format}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {publication.comicReader && (
        <ComicFrameReader
          publicationTitle={publication.title}
          reader={publication.comicReader}
        />
      )}

      <PublicationInterestForm
        publications={catalog.publications
          .filter((item) => canAccessPublication(item, session))
          .map((item) => ({
            id: item.id,
            title: item.title,
          }))}
        initialPublicationId={publication.id}
        heading="Ενδιαφέρομαι για αυτή την έκδοση"
      />
    </article>
  );
}

