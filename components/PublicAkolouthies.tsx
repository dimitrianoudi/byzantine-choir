"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import AudioEnhancerControls from "@/components/AudioEnhancerControls";
import { useAudioEnhancer } from "@/lib/useAudioEnhancer";

type Item = {
  key: string;
  name: string;
  lastModified?: string;
  size?: number;
};

export default function PublicAkolouthies() {
  const sp = useSearchParams();
  const initialKey = sp.get("key") || "";
  const initialYear = sp.get("year") || String(new Date().getFullYear());
  const initialDate = sp.get("date") || "";

  const [year, setYear] = useState(initialYear);
  const [date, setDate] = useState(initialDate);

  const [dates, setDates] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEnhancer = useAudioEnhancer(audioRef, { preferNativePlayback: true });
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const forceRefreshRef = useRef(sp.get("refresh") === "1");

  const didAutoPlay = useRef(false);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => String(current - i));
  }, []);
  const currentItem = useMemo(
    () => items.find((item) => item.key === currentKey) || null,
    [currentKey, items]
  );

  const getPublicBaseUrl = () => {
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin.replace(/\/$/, "");
    }
    return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  };

  const buildSharedAudioUrl = (title: string) => {
    const base = getPublicBaseUrl();
    const u = new URL(
      `/akolouthies/audio/${encodeURIComponent(date)}/${encodeURIComponent(title)}`,
      `${base}/`
    );
    return u.toString();
  };

  const shareItem = async (title: string) => {
    const url = buildSharedAudioUrl(title);

    try {
      if (navigator.share) {
        await navigator.share({ url });
        trackCount("public_akolouthies.share.native");
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(url);
      trackCount("public_akolouthies.share.copy");
    } catch {
      prompt("Αντιγράψτε τον σύνδεσμο:", url);
      trackCount("public_akolouthies.share.prompt");
    }
  };

  const load = async (y: string, d: string) => {
    const refresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    const t0 = performance.now();
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({
        year: y,
        date: d,
      });
      if (refresh) {
        params.set("refresh", "1");
      }

      const res = await fetch(
        `/api/public/akolouthies/list?${params.toString()}`,
        refresh ? { cache: "no-store" } : undefined
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Load failed");
      setDates(json.dates || []);
      setItems(json.items || []);
      setDate(json.date || d);
      trackCount("public_akolouthies.load.success");
    } catch (e: any) {
      Sentry.captureException(e);
      trackCount("public_akolouthies.load.error");
      setErr(e?.message || "Σφάλμα φόρτωσης");
    } finally {
      trackDistribution("public_akolouthies.load.duration_ms", performance.now() - t0);
      setLoading(false);
    }
  };

  useEffect(() => {
    didAutoPlay.current = false;
    void load(year, date);
  }, [year, date]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("refresh")) return;
    url.searchParams.delete("refresh");
    const nextSearch = url.searchParams.toString();
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`
    );
  }, []);

  const presign = async (key: string) => {
    const t0 = performance.now();
    const res = await fetch("/api/public/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Presign failed");
    trackCount("public_akolouthies.presign.success");
    trackDistribution("public_akolouthies.presign.duration_ms", performance.now() - t0);
    return json.url as string;
  };

  const togglePlay = async (key: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const isCurrentTrackLoaded = currentKey === key && !!audio.src;
      if (isCurrentTrackLoaded && !audio.paused) {
        audio.pause();
        setPlayingKey(null);
        trackCount("public_akolouthies.podcast.pause");
        return;
      }

      if (isCurrentTrackLoaded && audio.paused) {
        if (audioEnhancer.enabled) {
          await audioEnhancer.ensureReady();
        }
        await audio.play();
        setPlayingKey(key);
        trackCount("public_akolouthies.podcast.resume");
        return;
      }

      if (currentKey && currentKey !== key && !audio.paused) {
        audio.pause();
      }

      const url = await presign(key);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      audio.src = url;
      audio.load();
      if (audioEnhancer.enabled) {
        await audioEnhancer.ensureReady();
      }
      await audio.play();
      setPlayingKey(key);
      setCurrentKey(key);
      trackCount("public_akolouthies.podcast.play");
    } catch (e: any) {
      Sentry.captureException(e);
      trackCount("public_akolouthies.podcast.play_error");
      alert(e?.message || "Σφάλμα αναπαραγωγής");
    }
  };

  const seekCurrentTrack = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !currentKey) return;
    audio.currentTime = nextTime;
    setPlayerCurrentTime(nextTime);
    updateMediaSessionPosition(audio);
  };

  const toggleAudioEnhancer = async () => {
    if (!audioEnhancer.open) {
      await audioEnhancer.ensureReady();
    }
    audioEnhancer.setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!initialKey) return;
    if (didAutoPlay.current) return;
    if (!items.length) return;

    const found = items.find((x) => x.key === initialKey);
    if (!found) return;

    didAutoPlay.current = true;
    setCurrentKey(found.key);
    setHighlightedKey(found.key);
    setTimeout(() => {
      itemRefs.current[found.key]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    window.setTimeout(() => {
      setHighlightedKey((prev) => (prev === found.key ? null : prev));
    }, 3000);
  }, [items, initialKey]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const mediaSession = navigator.mediaSession;
    const audio = audioRef.current;

    if (!currentItem || !audio) {
      mediaSession.playbackState = "none";
      return;
    }

    if (typeof window.MediaMetadata !== "undefined") {
      mediaSession.metadata = new window.MediaMetadata({
        title: currentItem.name,
        artist: "Φροντιστήριο Ψαλτικής",
        album: "Ακολουθίες",
        artwork: [
          {
            src: "/logo_frontistirio_psaltikis.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
    }

    const setActionHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Some mobile browsers expose only part of the Media Session API.
      }
    };

    setActionHandler("play", () => {
      void audio.play();
    });
    setActionHandler("pause", () => {
      audio.pause();
    });
    setActionHandler("seekbackward", (details) => {
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
      updateMediaSessionPosition(audio);
    });
    setActionHandler("seekforward", (details) => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : Number.POSITIVE_INFINITY;
      audio.currentTime = Math.min(duration, audio.currentTime + (details.seekOffset || 10));
      updateMediaSessionPosition(audio);
    });
    setActionHandler("seekto", (details) => {
      if (typeof details.seekTime !== "number") return;
      audio.currentTime = details.seekTime;
      updateMediaSessionPosition(audio);
    });

    updateMediaSessionPosition(audio);
    mediaSession.playbackState = audio.paused ? "paused" : "playing";

    return () => {
      setActionHandler("play", null);
      setActionHandler("pause", null);
      setActionHandler("seekbackward", null);
      setActionHandler("seekforward", null);
      setActionHandler("seekto", null);
    };
  }, [currentItem]);

  return (
    <div className="space-y-6">
      <header className="toolbar">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Ακολουθίες
        </h1>
        <div className="header-spacer" />
      </header>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="text-sm text-muted">Έτος</label>
            <select
              className="input mt-1"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ maxWidth: 160 }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted">Ημερομηνία</label>
            <select
              className="input mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ maxWidth: 240 }}
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              {dates.length === 0 && <option value="">{date || "—"}</option>}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="card p-6">Φόρτωση…</div>}
      {err && <div className="card p-6 text-red">{err}</div>}

      {!loading && !err && (
        <div className="card p-6 divide-y divide-[color:var(--border)]">
          {items.length === 0 && <div className="p-4 text-muted">Δεν υπάρχουν αρχεία.</div>}

          {items.map((it) => (
            <div
              key={it.key}
              className={highlightedKey === it.key ? "py-4 shared-highlight" : "py-4"}
              ref={(el) => {
                itemRefs.current[it.key] = el;
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium break-all">{it.name}</div>
                  <div className="text-xs text-muted">
                    {it.lastModified ? new Date(it.lastModified).toLocaleString() : ""}
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3 sm:ml-auto flex-wrap">
                  <button className="btn" type="button" onClick={() => togglePlay(it.key)}>
                    {playingKey === it.key ? "Παύση" : "Αναπαραγωγή"}
                  </button>

                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={async () => {
                      const url = await presign(it.key);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = it.name;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      trackCount("public_akolouthies.file.download");
                    }}
                  >
                    Λήψη
                  </button>

                  <button
                    type="button"
                    className="icon-btn icon-btn-outline"
                    aria-label="Κοινοποίηση"
                    title="Κοινοποίηση"
                    onClick={() => shareItem(it.name)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M16 8a3 3 0 1 0-2.83-4H13a3 3 0 0 0 3 4Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 14a3 3 0 1 0 2.83 4H9a3 3 0 0 0-3-4Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M18 21a3 3 0 1 0-2.83-4H15a3 3 0 0 0 3 4Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8.6 15.4l6.8 3.2M15.4 7.4L8.6 10.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>

                </div>
              </div>

              <div className={currentKey === it.key ? "now-playing mt-3" : "hidden"}>
                <div className="now-playing-head">
                  <span className="now-playing-badge">Τώρα παίζει</span>
                  <span className="now-playing-title">{it.name}</span>
                </div>
                <div className="player-controls">
                  <button className="btn btn-sm btn-outline" type="button" onClick={() => togglePlay(it.key)}>
                    {playingKey === it.key ? "Παύση" : "Αναπαραγωγή"}
                  </button>
                  <div className="player-seek-wrap">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(playerDuration, 0)}
                      step={0.1}
                      value={Math.min(playerCurrentTime, playerDuration || 0)}
                      onChange={(e) => seekCurrentTrack(Number(e.target.value))}
                      className="player-seek"
                      aria-label="Μετακίνηση αναπαραγωγής"
                    />
                    <div className="player-time">
                      <span>{formatTime(playerCurrentTime)}</span>
                      <span>{formatTime(playerDuration)}</span>
                    </div>
                  </div>
                </div>
                {!audioEnhancer.nativePlaybackOnly && (
                  <AudioEnhancerControls
                    supported={audioEnhancer.supported}
                    open={audioEnhancer.open}
                    enabled={audioEnhancer.enabled}
                    presetId={audioEnhancer.presetId}
                    settings={audioEnhancer.settings}
                    error={audioEnhancer.error}
                    onToggleOpen={() => {
                      void toggleAudioEnhancer();
                    }}
                    onToggleEnabled={() => audioEnhancer.setEnabled(!audioEnhancer.enabled)}
                    onApplyPreset={audioEnhancer.applyPreset}
                    onUpdateSetting={audioEnhancer.updateSetting}
                    onReset={audioEnhancer.reset}
                  />
                )}
              </div>
            </div>
          ))}

          <audio
            ref={audioRef}
            className="sr-only"
            preload="auto"
            playsInline
            crossOrigin="anonymous"
            onPlay={() => {
              if (currentKey) setPlayingKey(currentKey);
              if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
            }}
            onPause={() => {
              setPlayingKey(null);
              if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
            }}
            onLoadedMetadata={(e) => {
              setPlayerDuration(e.currentTarget.duration || 0);
              updateMediaSessionPosition(e.currentTarget);
            }}
            onDurationChange={(e) => {
              setPlayerDuration(e.currentTarget.duration || 0);
              updateMediaSessionPosition(e.currentTarget);
            }}
            onTimeUpdate={(e) => {
              setPlayerCurrentTime(e.currentTarget.currentTime || 0);
              updateMediaSessionPosition(e.currentTarget);
            }}
            onEnded={() => {
              if (audioRef.current) audioRef.current.currentTime = 0;
              setPlayingKey(null);
              setPlayerCurrentTime(0);
              if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
            }}
          />
        </div>
      )}

      <style jsx>{`
        .shared-highlight {
          border-radius: 12px;
          background: rgba(var(--blue-rgb), 0.08);
          box-shadow: 0 0 0 2px rgba(var(--blue-rgb), 0.14);
          transition: background 220ms ease, box-shadow 220ms ease;
          padding-left: 10px;
          padding-right: 10px;
        }

        .now-playing {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(215, 166, 74, 0.1), rgba(255, 255, 255, 0.95));
          padding: 10px 12px 12px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
        }

        .now-playing-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          min-width: 0;
        }

        .now-playing-badge {
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 4px 10px;
          white-space: nowrap;
        }

        .now-playing-title {
          font-size: 13px;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .player-seek-wrap {
          flex: 1;
          min-width: 0;
        }

        .player-seek {
          width: 100%;
          accent-color: var(--blue-600);
        }

        .player-time {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 640px) {
          .now-playing {
            border-radius: 12px;
            padding: 10px;
          }

          .now-playing-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .now-playing-title {
            white-space: normal;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
          }

          .player-controls {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function updateMediaSessionPosition(audio: HTMLAudioElement) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  if (typeof navigator.mediaSession.setPositionState !== "function") return;

  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  if (!duration) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(audio.currentTime || 0, duration),
    });
  } catch {
    // Ignore browsers with incomplete position-state support.
  }
}

function trackCount(name: string) {
  try {
    Sentry.metrics.count(name, 1);
  } catch {}
}

function trackDistribution(name: string, value: number) {
  try {
    Sentry.metrics.distribution(name, Math.max(0, Math.round(value)));
  } catch {}
}
