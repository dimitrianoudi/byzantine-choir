"use client";

import Image from "next/image";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  PublicationAudience,
  PublicationSeries,
} from "@/lib/publications";

export type PublicationCardData = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  audience: PublicationAudience;
  series: string;
  seriesName: string;
  seriesColor: string;
  pages: number | null;
  formats: string[];
  cover: string | null;
  landscapeCover: boolean;
};

type AudienceFilter = "all" | PublicationAudience;

const audienceOptions: { id: AudienceFilter; label: string }[] = [
  { id: "all", label: "Όλες" },
  { id: "adult", label: "Ενήλικες" },
  { id: "kids", label: "Παιδιά" },
];

function PublicationCard({ publication }: { publication: PublicationCardData }) {
  return (
    <Link
      href={`/ekdoseis/${publication.slug}`}
      className="group flex h-full flex-col rounded-[1.15rem] border border-[#e7ddc8] bg-white p-3 no-underline shadow-[0_8px_24px_rgba(67,45,26,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(67,45,26,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b8893a]/25"
      style={{ "--series-color": publication.seriesColor } as CSSProperties}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[0.6rem_1rem_1rem_0.6rem] border border-[#eadfcb] bg-[#fbf8f1] shadow-[inset_5px_0_0_rgba(90,30,46,0.08)]">
        {publication.cover ? (
          <Image
            src={publication.cover}
            alt={`Εξώφυλλο: ${publication.title}`}
            fill
            sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 190px"
            className={
              publication.landscapeCover
                ? "object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
                : "object-cover transition duration-300 group-hover:scale-[1.025]"
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f3ecdf] px-4 text-center text-[#7b6c58]">
            <LockKeyhole
              size={30}
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold leading-5">
              Σύνδεση για προβολή εξωφύλλου
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-3 h-1 w-12 rounded-full"
        style={{ backgroundColor: publication.seriesColor }}
        aria-hidden="true"
      />
      <h3 className="mt-2 font-heading text-[1.05rem] leading-[1.22] text-[#2b2b2b]">
        {publication.title}
      </h3>
      {publication.subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-[#6e665c]">
          {publication.subtitle}
        </p>
      )}
      <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#8a6a2f]">
        {publication.seriesName}
      </p>
      <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 pt-3 text-xs text-[#6e665c]">
        {publication.pages && <span>{publication.pages} σελίδες</span>}
        {publication.pages && publication.formats.length > 0 && (
          <span aria-hidden="true">•</span>
        )}
        {publication.formats.length > 0 && (
          <span>{publication.formats.join(" · ")}</span>
        )}
      </div>
      <span className="mt-3 text-sm font-semibold text-[#5a1e2e]">
        Δείτε την έκδοση <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function AudienceSection({
  title,
  subtitle,
  publications,
}: {
  title: string;
  subtitle: string;
  publications: PublicationCardData[];
}) {
  if (publications.length === 0) return null;

  return (
    <section className="space-y-5" aria-labelledby={`audience-${publications[0].audience}`}>
      <div className="border-b border-[#dfd2bb] pb-3">
        <h2
          id={`audience-${publications[0].audience}`}
          className="font-heading text-[clamp(1.55rem,3vw,2rem)] font-bold text-[#5a1e2e]"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#6e665c]">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {publications.map((publication) => (
          <PublicationCard key={publication.id} publication={publication} />
        ))}
      </div>
    </section>
  );
}

export default function PublicationsCatalog({
  publications,
  series,
  audienceLabels,
}: {
  publications: PublicationCardData[];
  series: PublicationSeries[];
  audienceLabels: Record<
    PublicationAudience,
    { title: string; subtitle: string }
  >;
}) {
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [seriesId, setSeriesId] = useState("all");

  const availableSeries = useMemo(() => {
    const ids = new Set(
      publications
        .filter(
          (publication) =>
            audience === "all" || publication.audience === audience,
        )
        .map((publication) => publication.series),
    );
    return series.filter((item) => ids.has(item.id));
  }, [audience, publications, series]);

  useEffect(() => {
    if (
      seriesId !== "all" &&
      !availableSeries.some((item) => item.id === seriesId)
    ) {
      setSeriesId("all");
    }
  }, [availableSeries, seriesId]);

  const visible = useMemo(
    () =>
      publications.filter(
        (publication) =>
          (audience === "all" || publication.audience === audience) &&
          (seriesId === "all" || publication.series === seriesId),
      ),
    [audience, publications, seriesId],
  );

  const adults = visible.filter(
    (publication) => publication.audience === "adult",
  );
  const children = visible.filter(
    (publication) => publication.audience === "kids",
  );

  return (
    <div className="space-y-9">
      <section
        className="rounded-[1.25rem] border border-[#e7ddc8] bg-[#fbf8f1] p-4 sm:p-5"
        aria-label="Φίλτρα εκδόσεων"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">
            Αναγνώστες
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {audienceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  audience === option.id
                    ? "rounded-full border border-[#5a1e2e] bg-[#5a1e2e] px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-[#d8c9ad] bg-white px-4 py-2 text-sm font-semibold text-[#5a1e2e] transition hover:border-[#b8893a]"
                }
                aria-pressed={audience === option.id}
                onClick={() => setAudience(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-[#e7ddc8] pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">
            Σειρά
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={
                seriesId === "all"
                  ? "shrink-0 rounded-full border border-[#5a1e2e] bg-[#5a1e2e] px-4 py-2 text-sm font-semibold text-white"
                  : "shrink-0 rounded-full border border-[#d8c9ad] bg-white px-4 py-2 text-sm font-semibold text-[#5a1e2e]"
              }
              aria-pressed={seriesId === "all"}
              onClick={() => setSeriesId("all")}
            >
              Όλες οι σειρές
            </button>
            {availableSeries.map((item) => (
              <button
                key={item.id}
                type="button"
                className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition"
                style={{
                  borderColor: item.color,
                  backgroundColor: seriesId === item.id ? item.color : "white",
                  color: seriesId === item.id ? "white" : item.color,
                }}
                aria-pressed={seriesId === item.id}
                onClick={() => setSeriesId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-[#6e665c]" aria-live="polite">
          {visible.length} {visible.length === 1 ? "έκδοση" : "εκδόσεις"}
        </p>
      </section>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-[#e7ddc8] bg-white p-6 text-center text-[#6e665c]">
          Δεν βρέθηκαν εκδόσεις με αυτά τα φίλτρα.
        </div>
      ) : (
        <>
          <AudienceSection
            title={audienceLabels.adult.title}
            subtitle={audienceLabels.adult.subtitle}
            publications={adults}
          />
          <AudienceSection
            title={audienceLabels.kids.title}
            subtitle={audienceLabels.kids.subtitle}
            publications={children}
          />
        </>
      )}
    </div>
  );
}

