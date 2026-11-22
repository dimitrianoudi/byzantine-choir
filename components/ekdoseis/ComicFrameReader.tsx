"use client";

import NextImage from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import type { ComicReaderData } from "@/lib/publications";

type ReaderMode = "frame" | "page";

export default function ComicFrameReader({
  publicationTitle,
  reader,
}: {
  publicationTitle: string;
  reader: ComicReaderData;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ReaderMode>("frame");
  const [pageIndex, setPageIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [ended, setEnded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const page = reader.pages[pageIndex];
  const crop = mode === "page"
    ? ([0, 0, page.width, page.height] as const)
    : page.frames[frameIndex];
  const [cropX, cropY, cropWidth, cropHeight] = crop;
  const cropAspect = cropWidth / cropHeight;

  const totalFrames = useMemo(
    () =>
      reader.pages.reduce(
        (total, currentPage) => total + currentPage.frames.length,
        0,
      ),
    [reader.pages],
  );
  const currentFrameNumber =
    reader.pages
      .slice(0, pageIndex)
      .reduce(
        (total, currentPage) => total + currentPage.frames.length,
        0,
      ) +
    frameIndex +
    1;

  const resetView = () => {
    setPageIndex(0);
    setFrameIndex(0);
    setMode("frame");
    setZoomed(false);
    setEnded(false);
  };

  const openReader = () => {
    resetView();
    setOpen(true);
  };

  const closeReader = () => {
    setOpen(false);
    setZoomed(false);
    setEnded(false);
  };

  const goNext = () => {
    setZoomed(false);
    if (ended) return;

    if (mode === "page") {
      if (pageIndex < reader.pages.length - 1) {
        setPageIndex((current) => current + 1);
        setFrameIndex(0);
      } else {
        setEnded(true);
      }
      return;
    }

    if (frameIndex < page.frames.length - 1) {
      setFrameIndex((current) => current + 1);
      return;
    }

    if (pageIndex < reader.pages.length - 1) {
      setPageIndex((current) => current + 1);
      setFrameIndex(0);
      return;
    }

    setEnded(true);
  };

  const goPrevious = () => {
    setZoomed(false);
    if (ended) {
      setEnded(false);
      return;
    }

    if (mode === "page") {
      if (pageIndex > 0) {
        setPageIndex((current) => current - 1);
        setFrameIndex(0);
      }
      return;
    }

    if (frameIndex > 0) {
      setFrameIndex((current) => current - 1);
      return;
    }

    if (pageIndex > 0) {
      const previousPageIndex = pageIndex - 1;
      setPageIndex(previousPageIndex);
      setFrameIndex(reader.pages[previousPageIndex].frames.length - 1);
    }
  };

  const switchMode = (nextMode: ReaderMode) => {
    setMode(nextMode);
    setZoomed(false);
    setEnded(false);
    setFrameIndex((current) =>
      Math.min(current, reader.pages[pageIndex].frames.length - 1),
    );
  };

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();

      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
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
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ended, frameIndex, mode, pageIndex]);

  useEffect(() => {
    if (!open) return;
    const nextPage = reader.pages[pageIndex + 1];
    const previousPage = reader.pages[pageIndex - 1];
    for (const adjacent of [previousPage, nextPage]) {
      if (!adjacent) continue;
      const image = new window.Image();
      image.src = adjacent.image;
    }
  }, [open, pageIndex, reader.pages]);

  const onTouchStart = (event: TouchEvent) => {
    if (zoomed) return;
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (zoomed) return;
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < 50) {
      return;
    }
    if (end < start) goNext();
    else goPrevious();
  };

  const canGoPrevious =
    ended || pageIndex > 0 || (mode === "frame" && frameIndex > 0);
  const progress =
    mode === "frame"
      ? `Καρέ ${currentFrameNumber} από ${totalFrames}`
      : `Σελίδα ${pageIndex + 1} από ${reader.pages.length}`;

  return (
    <>
      <section className="rounded-[1.25rem] border border-[#dccaa8] bg-[#f6f1e7] p-5 shadow-[0_8px_24px_rgba(67,45,26,0.08)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">
          Διαδραστικό δείγμα
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-[#5a1e2e]">
          Διαβάστε το κόμικ καρέ-καρέ
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6e665c]">
          Κάθε καρέ προσαρμόζεται στην οθόνη. Χρησιμοποιήστε τα κουμπιά,
          τα βελάκια του πληκτρολογίου ή σάρωση στο κινητό.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5a1e2e] px-5 py-2.5 font-semibold text-white transition hover:bg-[#7a2e40]"
          onClick={openReader}
        >
          Έναρξη ανάγνωσης
        </button>
      </section>

      {open && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[110] flex flex-col bg-[#14100d] text-[#f1e9db]"
          role="dialog"
          aria-modal="true"
          aria-label={`Διαδραστικό δείγμα: ${publicationTitle}`}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <header className="flex min-h-14 items-center gap-2 border-b border-[#b8893a]/60 bg-[#5a1e2e] px-2.5 py-2 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold sm:text-base">
                {publicationTitle}
              </p>
              <p className="truncate text-[0.7rem] text-white/70">
                {ended ? "Τέλος δείγματος" : `${page.title} · ${progress}`}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border border-white/45 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
              aria-pressed={mode === "page"}
              onClick={() =>
                switchMode(mode === "frame" ? "page" : "frame")
              }
            >
              {mode === "frame" ? "Όλο το δισέλιδο" : "Καρέ-καρέ"}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className="shrink-0 rounded-full border border-white/45 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
              onClick={closeReader}
            >
              Κλείσιμο
            </button>
          </header>

          <div
            className={
              zoomed
                ? "flex min-h-0 flex-1 items-start justify-start overflow-auto p-2"
                : "flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-3"
            }
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {ended ? (
              <div className="mx-auto max-w-lg rounded-2xl border border-white/15 bg-white/[0.06] p-6 text-center">
                <p className="font-heading text-2xl font-bold text-[#ddb964]">
                  Εδώ τελειώνει το δείγμα
                </p>
                <p className="mt-3 leading-7 text-white/80">
                  Για το υπόλοιπο βιβλίο επικοινωνήστε μαζί μας.
                </p>
                <a
                  href="#interest"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#b8893a] px-5 font-semibold text-[#17120f] no-underline"
                  onClick={closeReader}
                >
                  Εκδήλωση ενδιαφέροντος
                </a>
              </div>
            ) : (
              <button
                type="button"
                className="relative shrink-0 cursor-zoom-in overflow-hidden rounded-md border-0 bg-white p-0 shadow-[0_10px_36px_rgba(0,0,0,0.65)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb964]"
                style={{
                  aspectRatio: `${cropWidth}/${cropHeight}`,
                  width: zoomed ? "200%" : "100%",
                  maxWidth: zoomed
                    ? "none"
                    : `${Math.max(42, Math.min(180, cropAspect * 70))}dvh`,
                  cursor: zoomed ? "zoom-out" : "zoom-in",
                }}
                onClick={() => setZoomed((current) => !current)}
                aria-label={
                  zoomed
                    ? "Επαναφορά μεγέθυνσης"
                    : "Μεγέθυνση εικόνας δύο φορές"
                }
              >
                <NextImage
                  key={`${page.image}-${mode}-${frameIndex}`}
                  src={page.image}
                  alt={`${page.title}, ${progress}`}
                  width={page.width}
                  height={page.height}
                  priority
                  draggable={false}
                  className="pointer-events-none absolute select-none"
                  style={{
                    width: `${(page.width / cropWidth) * 100}%`,
                    maxWidth: "none",
                    height: "auto",
                    left: `${(-cropX / cropWidth) * 100}%`,
                    top: `${(-cropY / cropHeight) * 100}%`,
                  }}
                />
              </button>
            )}
          </div>

          {!ended && (
            <p className="px-3 pb-1 text-center text-[0.7rem] text-white/55">
              Πατήστε την εικόνα για μεγέθυνση
            </p>
          )}

          <footer className="flex gap-3 border-t border-white/10 px-3 py-3 sm:px-5">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl border border-white/25 bg-white/10 px-4 font-semibold text-white disabled:opacity-35"
              onClick={goPrevious}
              disabled={!canGoPrevious}
            >
              Πίσω
            </button>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-[#b8893a] px-4 font-semibold text-[#17120f]"
              onClick={goNext}
              disabled={ended}
            >
              Επόμενο
            </button>
          </footer>
        </div>
      )}
    </>
  );
}

