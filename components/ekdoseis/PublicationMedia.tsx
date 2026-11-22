"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";

export type PublicationMediaItem = {
  slot: string;
  label: string;
  src: string;
};

export default function PublicationMedia({
  title,
  images,
}: {
  title: string;
  images: PublicationMediaItem[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = activeIndex !== null;

  const close = () => setActiveIndex(null);
  const previous = () =>
    setActiveIndex((current) =>
      current === null ? null : (current - 1 + images.length) % images.length,
    );
  const next = () =>
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % images.length,
    );

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null
            ? null
            : (current - 1 + images.length) % images.length,
        );
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % images.length,
        );
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [images.length, isOpen]);

  if (images.length === 0) return null;
  const active = activeIndex === null ? null : images[activeIndex];

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < 45) {
      return;
    }
    if (end < start) next();
    else previous();
  };

  return (
    <>
      <section className="space-y-4" aria-labelledby="publication-images">
        <div>
          <h2
            id="publication-images"
            className="font-heading text-2xl font-bold text-[#5a1e2e]"
          >
            Δείτε την έκδοση
          </h2>
          <p className="mt-1 text-sm text-[#6e665c]">
            Επιλέξτε εικόνα για προβολή σε μεγαλύτερο μέγεθος.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image, index) => (
            <button
              key={image.slot}
              type="button"
              className="group rounded-xl border border-[#e7ddc8] bg-white p-3 text-left shadow-[0_6px_18px_rgba(67,45,26,0.07)] transition hover:-translate-y-0.5 hover:border-[#b8893a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b8893a]/25"
              onClick={() => setActiveIndex(index)}
              aria-label={`${image.label}: ${title}`}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#fbf8f1]">
                <Image
                  src={image.src}
                  alt={`${image.label}: ${title}`}
                  fill
                  sizes="(max-width: 640px) 45vw, 260px"
                  className="object-contain transition duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <span className="mt-2 block text-sm font-semibold text-[#5a1e2e]">
                {image.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.label}: ${title}`}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex min-h-14 items-center gap-3 border-b border-white/15 px-3 py-2 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="text-xs text-white/65">
                {active.label} · {activeIndex! + 1}/{images.length}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 text-sm font-semibold text-white"
              onClick={close}
            >
              Κλείσιμο
            </button>
          </div>

          <div
            className="relative min-h-0 flex-1 touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image
              key={active.src}
              src={active.src}
              alt={`${active.label}: ${title}`}
              fill
              priority
              sizes="100vw"
              className="z-10 select-none object-contain p-3 sm:p-6"
              draggable={false}
            />
          </div>

          <div className="flex gap-3 border-t border-white/15 px-3 py-3 sm:px-5">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl border border-white/30 bg-white/10 px-4 font-semibold text-white disabled:opacity-40"
              onClick={previous}
              disabled={images.length < 2}
            >
              Πίσω
            </button>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-[#b8893a] px-4 font-semibold text-[#17120f] disabled:opacity-40"
              onClick={next}
              disabled={images.length < 2}
            >
              Επόμενο
            </button>
          </div>
        </div>
      )}
    </>
  );
}

