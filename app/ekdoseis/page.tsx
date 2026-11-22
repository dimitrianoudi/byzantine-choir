import type { Metadata } from "next";
import Link from "next/link";
import PublicationsCatalog, {
  type PublicationCardData,
} from "@/components/ekdoseis/PublicationsCatalog";
import PublicationInterestForm from "@/components/ekdoseis/PublicationInterestForm";
import TrumpetingAngel from "@/components/ekdoseis/TrumpetingAngel";
import {
  publicationAudiences,
  publications,
  publicationSeries,
  publicationPath,
} from "@/lib/publications";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

const pageTitle = "Εκδόσεις Ψαλτικής Παιδείας";
const pageDescription =
  "Βιβλία, διδακτικά τεύχη, μελέτες και εικονογραφημένο υλικό του Ενοριακού Φροντιστηρίου Ψαλτικής για παιδιά και ενήλικες.";

export const metadata: Metadata = {
  title: `${pageTitle} | ${SITE_NAME}`,
  description: pageDescription,
  alternates: { canonical: "/ekdoseis" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/ekdoseis",
    siteName: SITE_NAME,
    locale: "el_GR",
    type: "website",
    images: [
      {
        url: "/ekdoseis/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Εκδόσεις Ψαλτικής Παιδείας",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/ekdoseis/opengraph-image"],
  },
};

export default function PublicationsPage() {
  const cards: PublicationCardData[] = publications.map((publication) => ({
    id: publication.id,
    slug: publication.slug,
    title: publication.title,
    subtitle: publication.subtitle,
    audience: publication.audience,
    series: publication.series,
    seriesName: publication.seriesName,
    seriesColor: publication.seriesColor,
    pages: publication.pages,
    formats: publication.formats,
    cover: publication.images.cover!,
    landscapeCover: publication.landscapeCover,
  }));

  const adultCount = publications.filter(
    (publication) => publication.audience === "adult",
  ).length;
  const childrenCount = publications.length - adultCount;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pageTitle,
    description: pageDescription,
    url: absoluteUrl("/ekdoseis"),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: publications.length,
      itemListElement: publications.map((publication, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(publicationPath(publication)),
        name: publication.title,
      })),
    },
  };

  return (
    <div className="space-y-10 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c"),
        }}
      />
      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#e3d5bc] bg-[#f6f1e7] px-5 py-8 shadow-[0_14px_38px_rgba(67,45,26,0.1)] sm:px-8 sm:py-10">
        <TrumpetingAngel className="pointer-events-none absolute -right-5 top-2 h-32 w-52 opacity-30 sm:right-5 sm:top-5 sm:h-44 sm:w-72" />
        <div
          className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-[#5a1e2e]/[0.06]"
          aria-hidden="true"
        />

        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a2f]">
            Ψαλτική Παιδεία
          </p>
          <h1 className="mt-3 font-heading text-[clamp(2.2rem,7vw,4.5rem)] font-bold leading-[0.98] text-[#5a1e2e]">
            Εκδόσεις
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#554f47] sm:text-lg">
            Βιβλία, διδακτικά τεύχη, μελέτες και εικονογραφημένο υλικό
            του Ενοριακού Φροντιστηρίου Ψαλτικής για παιδιά και ενήλικες.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e665c]">
            Περιηγηθείτε στα εξώφυλλα και στα διαθέσιμα δείγματα. Αν σας
            ενδιαφέρει κάποια έκδοση, αφήστε τα στοιχεία σας και θα
            επικοινωνήσουμε μαζί σας.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#catalog"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5a1e2e] px-5 py-2.5 font-semibold text-white no-underline transition hover:bg-[#7a2e40]"
            >
              Περιήγηση στις εκδόσεις
            </a>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cdbb98] bg-white/80 px-5 py-2.5 font-semibold text-[#5a1e2e] no-underline transition hover:border-[#b8893a]"
            >
              Γνωρίστε το Φροντιστήριο
            </Link>
          </div>
        </div>

        <dl className="relative mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-[#d9c9ab] pt-5">
          <div>
            <dt className="text-xs text-[#6e665c]">Σύνολο</dt>
            <dd className="font-heading text-2xl font-bold text-[#5a1e2e]">
              {publications.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6e665c]">Ενηλίκων</dt>
            <dd className="font-heading text-2xl font-bold text-[#5a1e2e]">
              {adultCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6e665c]">Παιδικές</dt>
            <dd className="font-heading text-2xl font-bold text-[#5a1e2e]">
              {childrenCount}
            </dd>
          </div>
        </dl>
      </section>

      <div id="catalog" className="scroll-mt-32">
        <PublicationsCatalog
          publications={cards}
          series={publicationSeries}
          audienceLabels={publicationAudiences}
        />
      </div>

      <PublicationInterestForm
        publications={publications.map((publication) => ({
          id: publication.id,
          title: publication.title,
        }))}
      />
    </div>
  );
}

