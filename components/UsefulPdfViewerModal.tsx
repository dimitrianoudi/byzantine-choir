'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { getPdfJs } from '@/lib/pdfjsClient';
import { getUsefulOfflinePdfResponse } from '@/lib/usefulOffline';

type Props = {
  open: boolean;
  title: string;
  pdfUrl: string;
  onClose: () => void;
};

type OutlineNode = {
  id: string;
  title: string;
  pageNumber: number | null;
  items: OutlineNode[];
};

type SearchResult = {
  pageNumber: number;
  count: number;
};

type HighlightBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MIN_SCALE = 0.75;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;
const THUMBNAIL_WIDTH = 92;
const VIEWER_PAGE_KEY_PREFIX = 'bcp:useful-viewer:last-page:';

export default function UsefulPdfViewerModal({ open, title, pdfUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Φόρτωση PDF...');
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pageCount, setPageCount] = useState(0);
  const [manualScale, setManualScale] = useState(1);
  const [renderScale, setRenderScale] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'outline'>('thumbnails');
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPageHighlights, setCurrentPageHighlights] = useState<HighlightBox[]>([]);

  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const searchIndexRef = useRef<Map<number, string>>(new Map());
  const pageTextItemsRef = useRef<Map<number, any[]>>(new Map());
  const searchRequestIdRef = useRef(0);
  const thumbnailCacheRef = useRef<Map<string, string>>(new Map());

  const totalSearchMatches = useMemo(
    () => searchResults.reduce((sum, result) => sum + result.count, 0),
    [searchResults]
  );
  const searchCountByPage = useMemo(() => {
    const map = new Map<number, number>();
    searchResults.forEach((result) => map.set(result.pageNumber, result.count));
    return map;
  }, [searchResults]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(typeof document !== 'undefined' && !!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupPdfDoc(pdfDocRef, renderTaskRef);
      searchIndexRef.current.clear();
      pageTextItemsRef.current.clear();
      setLoading(false);
      setLoadingStep('Φόρτωση PDF...');
      setError(null);
      setPageNumber(1);
      setPageInput('1');
      setPageCount(0);
      setManualScale(1);
      setRenderScale(1);
      setFitToWidth(true);
      setContainerWidth(0);
      setSidebarTab('thumbnails');
      setOutline([]);
      setSearchInput('');
      setSearchStatus(null);
      setSearchResults([]);
      setActiveSearchIndex(-1);
      setCurrentPageHighlights([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setLoadingStep('Ανάγνωση αποθηκευμένου PDF...');
      setPageNumber(1);
      setPageInput('1');
      setPageCount(0);
      setManualScale(1);
      setRenderScale(1);
      setFitToWidth(true);
      setOutline([]);
      setSearchInput('');
      setSearchStatus(null);
      setSearchResults([]);
      setActiveSearchIndex(-1);
      setCurrentPageHighlights([]);
      searchIndexRef.current.clear();
      pageTextItemsRef.current.clear();
      setOutlineOpen(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);
      setSidebarTab('thumbnails');

      try {
        const response = await getUsefulOfflinePdfResponse(pdfUrl);
        if (!response) {
          throw new Error('Το PDF δεν είναι διαθέσιμο σε αυτή τη συσκευή.');
        }

        const data = new Uint8Array(await response.arrayBuffer());
        setLoadingStep('Φόρτωση μηχανής PDF...');
        const pdfjs = await getPdfJs();
        setLoadingStep('Ανάλυση PDF...');
        const task = pdfjs.getDocument({ data });
        const pdf = await task.promise;

        if (cancelled) {
          try {
            await pdf.destroy();
          } catch {}
          return;
        }

        cleanupPdfDoc(pdfDocRef, renderTaskRef);
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages || 1);
        const rememberedPage = readRememberedPage(pdfUrl, pdf.numPages || 1);
        const initialPage = rememberedPage ?? 1;
        setPageNumber(initialPage);
        setPageInput(String(initialPage));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Αποτυχία φόρτωσης PDF.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingStep('');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl]);

  useEffect(() => {
    if (!open || loading || !!error || !pdfDocRef.current) return;

    let cancelled = false;

    const loadOutline = async () => {
      try {
        setLoadingStep('Φόρτωση σελιδοδεικτών...');
        const pdf = pdfDocRef.current;
        const rawOutline = await pdf.getOutline();
        if (cancelled) return;

        const mapped = rawOutline ? await mapOutline(rawOutline, pdf) : [];
        if (cancelled) return;

        setOutline(mapped);
        if (mapped.length > 0) setSidebarTab('outline');
      } catch {
        if (!cancelled) {
          setOutline([]);
        }
      } finally {
        if (!cancelled) setLoadingStep('');
      }
    };

    void loadOutline();

    return () => {
      cancelled = true;
    };
  }, [open, loading, error, pdfUrl]);

  useEffect(() => {
    if (!open || !canvasWrapRef.current) return;

    const updateWidth = () => {
      const nextWidth = canvasWrapRef.current?.clientWidth || 0;
      setContainerWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(canvasWrapRef.current);
    return () => observer.disconnect();
  }, [open, outlineOpen]);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  useEffect(() => {
    if (!open || pageCount <= 0) return;
    rememberPage(pdfUrl, pageNumber);
  }, [open, pdfUrl, pageNumber, pageCount]);

  const getPageTextData = async (targetPage: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf) return { normalized: '', items: [] as any[] };

    const cachedText = searchIndexRef.current.get(targetPage);
    const cachedItems = pageTextItemsRef.current.get(targetPage);
    if (cachedText !== undefined && cachedItems) {
      return { normalized: cachedText, items: cachedItems };
    }

    const pageProxy = await pdf.getPage(targetPage);
    const textContent = await pageProxy.getTextContent();
    const items = (textContent.items || []).filter((item: any) => 'str' in item);
    const normalized = normalizeSearchText(
      items
        .map((item: any) => String(item.str || ''))
        .join(' ')
    );

    searchIndexRef.current.set(targetPage, normalized);
    pageTextItemsRef.current.set(targetPage, items);
    return { normalized, items };
  };

  useEffect(() => {
    if (!open || loading || !!error || !pdfDocRef.current || !canvasRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        const pdf = pdfDocRef.current;
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');

        const baseViewport = page.getViewport({ scale: 1 });
        const nextScale = fitToWidth
          ? clamp((Math.max(280, containerWidth || window.innerWidth - 32) - 12) / baseViewport.width, MIN_SCALE, MAX_SCALE)
          : clamp(manualScale, MIN_SCALE, MAX_SCALE);

        const viewport = page.getViewport({ scale: nextScale });
        setRenderScale(nextScale);

        if (renderTaskRef.current?.cancel) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        renderTaskRef.current = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || cancelled) return;
        setError(err?.message || 'Αποτυχία απόδοσης PDF.');
      }
    };

    void render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current?.cancel) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [open, loading, error, pageNumber, manualScale, fitToWidth, containerWidth]);

  useEffect(() => {
    if (!open || loading || !!error || !pdfDocRef.current) {
      setCurrentPageHighlights([]);
      return;
    }

    const query = normalizeSearchText(searchInput);
    if (!query) {
      setCurrentPageHighlights([]);
      return;
    }

    let cancelled = false;

    const loadHighlights = async () => {
      try {
        const { items } = await getPageTextData(pageNumber);
        const pdf = pdfDocRef.current;
        if (!pdf) return;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: renderScale });
        const pdfjs: any = await getPdfJs();
        const boxes = buildHighlightBoxes(items, query, viewport, pdfjs?.Util);
        if (!cancelled) {
          setCurrentPageHighlights(boxes);
        }
      } catch {
        if (!cancelled) setCurrentPageHighlights([]);
      }
    };

    void loadHighlights();

    return () => {
      cancelled = true;
    };
  }, [open, loading, error, pageNumber, renderScale, searchInput]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        setPageNumber((prev) => Math.max(1, prev - 1));
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        setPageNumber((prev) => Math.min(pageCount || 1, prev + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, pageCount]);

  const goToPage = (value: number) => {
    const next = clamp(Math.round(value), 1, pageCount || 1);
    setPageNumber(next);
  };

  const commitPageInput = () => {
    const parsed = Number(pageInput);
    if (Number.isFinite(parsed)) goToPage(parsed);
    else setPageInput(String(pageNumber));
  };

  const zoomIn = () => {
    setFitToWidth(false);
    setManualScale((prev) => clamp((fitToWidth ? renderScale : prev) + SCALE_STEP, MIN_SCALE, MAX_SCALE));
  };

  const zoomOut = () => {
    setFitToWidth(false);
    setManualScale((prev) => clamp((fitToWidth ? renderScale : prev) - SCALE_STEP, MIN_SCALE, MAX_SCALE));
  };

  const fitWidth = () => {
    setFitToWidth(true);
  };

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current.requestFullscreen();
    } catch {}
  };

  const downloadPdf = async () => {
    try {
      const response = await getUsefulOfflinePdfResponse(pdfUrl);
      if (!response) throw new Error('Το PDF δεν είναι διαθέσιμο.');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      setSearchStatus(err?.message || 'Αποτυχία λήψης PDF.');
    }
  };

  const runSearch = async () => {
    const query = normalizeSearchText(searchInput);
    if (!query) {
      setSearchStatus(null);
      setSearchResults([]);
      setActiveSearchIndex(-1);
      return;
    }
    if (!pdfDocRef.current) return;

    const requestId = ++searchRequestIdRef.current;
    setSearching(true);
    setSearchStatus('Αναζήτηση στο PDF...');

    try {
      const pdf = pdfDocRef.current;
      const results: SearchResult[] = [];

      for (let page = 1; page <= pdf.numPages; page++) {
        const { normalized } = await getPageTextData(page);
        const count = countOccurrences(normalized, query);
        if (count > 0) results.push({ pageNumber: page, count });
      }

      if (requestId !== searchRequestIdRef.current) return;

      setSearchResults(results);
      if (results.length > 0) {
        setActiveSearchIndex(0);
        setSearchStatus(`Βρέθηκαν αποτελέσματα σε ${results.length} ${results.length === 1 ? 'σελίδα' : 'σελίδες'}.`);
        goToPage(results[0].pageNumber);
      } else {
        setActiveSearchIndex(-1);
        setSearchStatus('Δεν βρέθηκαν αποτελέσματα.');
      }
    } catch (err: any) {
      setSearchStatus(err?.message || 'Η αναζήτηση δεν ολοκληρώθηκε.');
    } finally {
      if (requestId === searchRequestIdRef.current) setSearching(false);
    }
  };

  const jumpToSearchResult = (direction: 1 | -1) => {
    if (searchResults.length === 0) return;
    const nextIndex =
      activeSearchIndex < 0
        ? 0
        : (activeSearchIndex + direction + searchResults.length) % searchResults.length;
    setActiveSearchIndex(nextIndex);
    goToPage(searchResults[nextIndex].pageNumber);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="viewer-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="viewer-shell" ref={shellRef}>
        <header className="viewer-toolbar">
          <div className="viewer-title-wrap">
            <div className="viewer-title">{title}</div>
            <div className="viewer-meta">
              Σελίδα {pageNumber} / {pageCount || '...'} • {Math.round(renderScale * 100)}%
              {searchInput.trim() ? ` • Τρέχουσα σελίδα: ${currentPageHighlights.length} επισημάνσεις` : ''}
            </div>
          </div>

          <div className="viewer-controls">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOutlineOpen((v) => !v)}>
              {outlineOpen ? 'Κλείσιμο σελιδοδεικτών' : 'Σελιδοδείκτες'}
            </button>

            <button type="button" className="btn btn-outline btn-sm" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
              Προηγ.
            </button>

            <div className="page-jump">
              <input
                className="input input--full page-input"
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPageInput();
                }}
                aria-label="Μετάβαση σε σελίδα"
              />
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageCount === 0 || pageNumber >= pageCount}
            >
              Επόμ.
            </button>

            <button type="button" className="btn btn-outline btn-sm" onClick={zoomOut}>
              -
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={fitWidth}>
              Πλάτος
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={zoomIn}>
              +
            </button>

            <button type="button" className="btn btn-outline btn-sm" onClick={toggleFullscreen}>
              {isFullscreen ? 'Έξοδος full screen' : 'Full screen'}
            </button>

            <button type="button" className="btn btn-outline btn-sm" onClick={downloadPdf}>
              Λήψη
            </button>

            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Κλείσιμο
            </button>
          </div>
        </header>

        <div className="viewer-searchbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
          >
            <input
              className="input input--full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Αναζήτηση μέσα στο PDF"
              aria-label="Αναζήτηση στο PDF"
            />
            <button type="submit" className="btn btn-outline btn-sm" disabled={searching || loading}>
              {searching ? 'Αναζήτηση...' : 'Αναζήτηση'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => jumpToSearchResult(-1)}
              disabled={searchResults.length === 0}
            >
              Προηγ. εύρημα
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => jumpToSearchResult(1)}
              disabled={searchResults.length === 0}
            >
              Επόμ. εύρημα
            </button>
          </form>

          <div className="search-status">
            {searchStatus ||
              (searchResults.length > 0
                ? `Αποτελέσματα: ${searchResults.length} ${searchResults.length === 1 ? 'σελίδα' : 'σελίδες'} • ${totalSearchMatches} εμφανίσεις`
                : 'Μπορείτε να αναζητήσετε λέξεις ή φράσεις και να μεταβείτε στις σελίδες που τις περιέχουν.')}
          </div>
        </div>

        <div className="viewer-body">
          {outlineOpen && (
            <aside className="viewer-sidebar">
              <div className="sidebar-switch">
                <button
                  type="button"
                  className={`sidebar-switch-btn ${sidebarTab === 'thumbnails' ? 'sidebar-switch-btn--active' : ''}`}
                  onClick={() => setSidebarTab('thumbnails')}
                >
                  Σελίδες
                </button>
                <button
                  type="button"
                  className={`sidebar-switch-btn ${sidebarTab === 'outline' ? 'sidebar-switch-btn--active' : ''}`}
                  onClick={() => setSidebarTab('outline')}
                >
                  Περιεχόμενα
                </button>
              </div>

              {sidebarTab === 'thumbnails' ? (
                <>
                  <div className="sidebar-title">Σελίδες</div>
                  <div className="thumbnail-list">
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((thumbPage) => (
                      <ThumbnailButton
                        key={`thumb-${thumbPage}`}
                        pdf={pdfDocRef.current}
                        cacheKey={pdfUrl}
                        cacheRef={thumbnailCacheRef}
                        pageNumber={thumbPage}
                        active={thumbPage === pageNumber}
                        matchCount={searchCountByPage.get(thumbPage) || 0}
                        onNavigate={goToPage}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="sidebar-title">Σελιδοδείκτες</div>
                  {outline.length > 0 ? (
                    <OutlineTree items={outline} onNavigate={goToPage} activePage={pageNumber} />
                  ) : (
                    <div className="sidebar-empty">Το PDF δεν έχει σελιδοδείκτες.</div>
                  )}

                  {searchResults.length > 0 && (
                    <>
                      <div className="sidebar-title sidebar-title-spaced">Αποτελέσματα αναζήτησης</div>
                      <div className="search-results-list">
                        {searchResults.map((result, index) => (
                          <button
                            key={`${result.pageNumber}-${index}`}
                            type="button"
                            className={`search-result-item ${index === activeSearchIndex ? 'search-result-item--active' : ''}`}
                            onClick={() => {
                              setActiveSearchIndex(index);
                              goToPage(result.pageNumber);
                            }}
                          >
                            <span>Σελίδα {result.pageNumber}</span>
                            <span>{result.count} εμφανίσεις</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </aside>
          )}

          <main className="viewer-main">
            <div className="canvas-wrap" ref={canvasWrapRef}>
              {loading && <div className="viewer-status">{loadingStep || 'Φόρτωση PDF...'}</div>}
              {!loading && error && <div className="viewer-status viewer-status-error">{error}</div>}
              {!loading && !error && (
                <div className="page-stage">
                  <canvas ref={canvasRef} className="viewer-canvas" aria-label={`Σελίδα ${pageNumber}`} />
                  {currentPageHighlights.length > 0 && (
                    <div className="highlight-layer" aria-hidden="true">
                      {currentPageHighlights.map((box, index) => (
                        <div
                          key={`highlight-${pageNumber}-${index}`}
                          className="highlight-box"
                          style={{
                            left: `${box.left}px`,
                            top: `${box.top}px`,
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 2200;
          background: rgba(10, 14, 24, 0.84);
          backdrop-filter: blur(3px);
        }

        .viewer-shell {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: rgba(250, 252, 255, 0.96);
        }

        .viewer-toolbar {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          background: rgba(255, 255, 255, 0.92);
        }

        .viewer-title-wrap {
          min-width: 0;
          flex: 1;
        }

        .viewer-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .viewer-meta {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }

        .viewer-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .viewer-searchbar {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.88);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-form {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-status {
          font-size: 12px;
          color: var(--muted);
        }

        .page-jump {
          width: 82px;
        }

        .page-input {
          text-align: center;
        }

        .viewer-body {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .viewer-sidebar {
          width: min(320px, 82vw);
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.92);
          overflow: auto;
          padding: 14px;
        }

        .sidebar-switch {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .sidebar-switch-btn {
          flex: 1;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.02);
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          padding: 8px 10px;
        }

        .sidebar-switch-btn--active {
          border-color: var(--blue-600);
          background: rgba(var(--blue-rgb), 0.1);
          color: var(--blue-700);
        }

        .sidebar-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
        }

        .sidebar-title-spaced {
          margin-top: 18px;
        }

        .sidebar-empty {
          font-size: 12px;
          color: var(--muted);
        }

        .viewer-main {
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow: auto;
          background:
            radial-gradient(circle at top, rgba(var(--blue-rgb), 0.08), transparent 45%),
            #f5f1e7;
        }

        .canvas-wrap {
          min-height: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
        }

        .page-stage {
          position: relative;
          display: inline-block;
        }

        .viewer-status {
          width: 100%;
          text-align: center;
          color: var(--muted);
          padding: 56px 16px;
        }

        .viewer-status-error {
          color: #b42318;
        }

        .viewer-canvas {
          display: block;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
          max-width: 100%;
          height: auto;
        }

        .highlight-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .highlight-box {
          position: absolute;
          background: rgba(255, 215, 0, 0.35);
          border: 1px solid rgba(255, 184, 0, 0.75);
          border-radius: 4px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
        }

        .thumbnail-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .search-results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-result-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
          color: var(--text);
          text-align: left;
        }

        .search-result-item--active {
          border-color: var(--blue-600);
          background: rgba(var(--blue-rgb), 0.08);
        }

        @media (max-width: 900px) {
          .viewer-toolbar,
          .viewer-searchbar {
            padding-inline: 10px;
          }

          .viewer-sidebar {
            position: absolute;
            z-index: 1;
            inset: 124px auto 0 0;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
          }

          .canvas-wrap {
            padding: 12px;
          }

          .viewer-title {
            white-space: normal;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

function OutlineTree({
  items,
  onNavigate,
  activePage,
  level = 0,
}: {
  items: OutlineNode[];
  onNavigate: (pageNumber: number) => void;
  activePage: number;
  level?: number;
}) {
  return (
    <div className="outline-tree">
      {items.map((item) => (
        <div key={item.id} className="outline-node">
          <button
            type="button"
            className={`outline-button ${item.pageNumber === activePage ? 'outline-button--active' : ''}`}
            style={{ paddingLeft: `${level * 14}px` }}
            onClick={() => {
              if (item.pageNumber) onNavigate(item.pageNumber);
            }}
            disabled={!item.pageNumber}
            title={item.pageNumber ? `Μετάβαση στη σελίδα ${item.pageNumber}` : 'Χωρίς σύνδεση σε σελίδα'}
          >
            <span>{item.title || 'Χωρίς τίτλο'}</span>
            {item.pageNumber ? <span className="outline-page">{item.pageNumber}</span> : null}
          </button>
          {item.items.length > 0 && (
            <OutlineTree items={item.items} onNavigate={onNavigate} activePage={activePage} level={level + 1} />
          )}
        </div>
      ))}

      <style jsx>{`
        .outline-tree {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .outline-button {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
          background: transparent;
          border: 0;
          border-radius: 8px;
          padding: 7px 8px;
          color: var(--text);
          font-size: 13px;
        }

        .outline-button:hover:not(:disabled) {
          background: rgba(var(--blue-rgb), 0.08);
        }

        .outline-button--active {
          background: rgba(var(--blue-rgb), 0.12);
          color: var(--blue-700);
        }

        .outline-button:disabled {
          opacity: 0.55;
        }

        .outline-page {
          color: var(--muted);
          flex-shrink: 0;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function ThumbnailButton({
  pdf,
  cacheKey,
  cacheRef,
  pageNumber,
  active,
  matchCount,
  onNavigate,
}: {
  pdf: any;
  cacheKey: string;
  cacheRef: MutableRefObject<Map<string, string>>;
  pageNumber: number;
  active: boolean;
  matchCount: number;
  onNavigate: (pageNumber: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !shouldRender || src) return;

    const key = `${cacheKey}:${pageNumber}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / viewport.width;
        const thumbViewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.ceil(thumbViewport.width);
        canvas.height = Math.ceil(thumbViewport.height);
        await page.render({
          canvasContext: ctx,
          viewport: thumbViewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        if (!cancelled) {
          cacheRef.current.set(key, dataUrl);
          setSrc(dataUrl);
        }
      } catch {}
    };

    void renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [pdf, shouldRender, src, cacheKey, pageNumber, cacheRef]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`thumbnail-item ${active ? 'thumbnail-item--active' : ''}`}
      onClick={() => onNavigate(pageNumber)}
    >
      <div className="thumbnail-preview">
        {src ? (
          <img src={src} alt={`Μικρογραφία σελίδας ${pageNumber}`} className="thumbnail-image" />
        ) : (
          <div className="thumbnail-placeholder">{pageNumber}</div>
        )}
      </div>

      <div className="thumbnail-meta">
        <div className="thumbnail-label">Σελίδα {pageNumber}</div>
        {matchCount > 0 && <div className="thumbnail-match">{matchCount} αποτελέσματα</div>}
      </div>

      <style jsx>{`
        .thumbnail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.78);
          text-align: left;
        }

        .thumbnail-item--active {
          border-color: var(--blue-600);
          background: rgba(var(--blue-rgb), 0.1);
        }

        .thumbnail-preview {
          width: ${THUMBNAIL_WIDTH}px;
          height: ${Math.round((THUMBNAIL_WIDTH * 4) / 3)}px;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          background: #f2ede2;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
        }

        .thumbnail-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
        }

        .thumbnail-meta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .thumbnail-label {
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
        }

        .thumbnail-match {
          color: var(--muted);
          font-size: 11px;
        }
      `}</style>
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildViewerPageKey(pdfUrl: string) {
  return `${VIEWER_PAGE_KEY_PREFIX}${encodeURIComponent(pdfUrl)}`;
}

function readRememberedPage(pdfUrl: string, pageCount: number) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(buildViewerPageKey(pdfUrl));
    const page = Number(raw);
    if (!Number.isFinite(page)) return null;
    return clamp(page, 1, Math.max(1, pageCount));
  } catch {
    return null;
  }
}

function rememberPage(pdfUrl: string, pageNumber: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(buildViewerPageKey(pdfUrl), String(pageNumber));
  } catch {}
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length || 1;
  }
  return count;
}

async function mapOutline(items: any[], pdf: any, prefix = 'o'): Promise<OutlineNode[]> {
  const mapped: OutlineNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pageNumber = await resolveOutlinePageNumber(item?.dest, pdf);
    mapped.push({
      id: `${prefix}-${i}`,
      title: String(item?.title || 'Χωρίς τίτλο'),
      pageNumber,
      items: Array.isArray(item?.items) && item.items.length > 0 ? await mapOutline(item.items, pdf, `${prefix}-${i}`) : [],
    });
  }

  return mapped;
}

async function resolveOutlinePageNumber(dest: unknown, pdf: any) {
  try {
    let resolvedDest = dest as any;
    if (typeof resolvedDest === 'string') {
      resolvedDest = await pdf.getDestination(resolvedDest);
    }
    if (!Array.isArray(resolvedDest) || !resolvedDest[0]) return null;
    const pageIndex = await pdf.getPageIndex(resolvedDest[0]);
    return Number.isFinite(pageIndex) ? pageIndex + 1 : null;
  } catch {
    return null;
  }
}

function buildHighlightBoxes(items: any[], query: string, viewport: any, util: any): HighlightBox[] {
  const boxes: HighlightBox[] = [];

  for (const item of items) {
    const raw = String(item?.str || '');
    const normalized = normalizeSearchText(raw);
    if (!raw || !normalized || !normalized.includes(query)) continue;

    const tx = util?.transform
      ? util.transform(viewport.transform, item.transform)
      : multiplyTransforms(viewport.transform, item.transform);

    const itemWidth = Math.max(8, item.width * viewport.scale);
    const itemHeight =
      Math.max(
        10,
        Math.abs(tx[3]) || Math.abs(tx[0]) || item.height * viewport.scale || 12
      );
    const itemLeft = tx[4];
    const itemTop = tx[5] - itemHeight;
    const unitWidth = itemWidth / Math.max(normalized.length, 1);

    let startIndex = 0;
    while (startIndex < normalized.length) {
      const matchIndex = normalized.indexOf(query, startIndex);
      if (matchIndex === -1) break;

      boxes.push({
        left: itemLeft + matchIndex * unitWidth,
        top: itemTop,
        width: Math.max(6, unitWidth * query.length),
        height: itemHeight,
      });

      startIndex = matchIndex + Math.max(query.length, 1);
    }
  }

  return boxes;
}

function multiplyTransforms(m1: number[], m2: number[]) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function cleanupPdfDoc(pdfDocRef: MutableRefObject<any>, renderTaskRef: MutableRefObject<any>) {
  if (renderTaskRef.current?.cancel) {
    try {
      renderTaskRef.current.cancel();
    } catch {}
    renderTaskRef.current = null;
  }

  if (pdfDocRef.current) {
    try {
      void pdfDocRef.current.destroy();
    } catch {}
    pdfDocRef.current = null;
  }
}
