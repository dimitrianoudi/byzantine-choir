"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const didAutoPlay = useRef(false);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => String(current - i));
  }, []);

  const shareUrl = useMemo(() => {
    const u = new URL(window.location.href);
    u.pathname = "/akolouthies";
    u.searchParams.set("year", year);
    if (date) u.searchParams.set("date", date);
    else u.searchParams.delete("date");
    u.searchParams.delete("key");
    return u.toString();
  }, [year, date]);

  const buildItemUrl = (k: string) => {
    const u = new URL(window.location.href);
    u.pathname = "/akolouthies";
    u.searchParams.set("year", year);
    if (date) u.searchParams.set("date", date);
    u.searchParams.set("key", k);
    return u.toString();
  };

  const shareItem = async (k: string, title: string) => {
    const url = buildItemUrl(k);

    try {
      if (navigator.share) {
        await navigator.share({ title: "Ακολουθία", text: title, url });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(url);
      alert("Αντιγράφηκε ο σύνδεσμος.");
    } catch {
      prompt("Αντιγράψτε τον σύνδεσμο:", url);
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Αντιγράφηκε ο σύνδεσμος!");
    } catch {
      prompt("Αντιγράψτε τον σύνδεσμο:", shareUrl);
    }
  };

  const load = async (y: string, d: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/public/akolouthies/list?year=${encodeURIComponent(y)}&date=${encodeURIComponent(d)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Load failed");
      setDates(json.dates || []);
      setItems(json.items || []);
      setDate(json.date || d);
    } catch (e: any) {
      setErr(e?.message || "Σφάλμα φόρτωσης");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    didAutoPlay.current = false;
    load(year, date);
  }, [year, date]);

  const presign = async (key: string) => {
    const res = await fetch("/api/public/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Presign failed");
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
        return;
      }

      if (isCurrentTrackLoaded && audio.paused) {
        await audio.play();
        setPlayingKey(key);
        return;
      }

      const url = await presign(key);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      audio.src = url;
      await audio.play();
      setPlayingKey(key);
      setCurrentKey(key);
    } catch (e: any) {
      alert(e?.message || "Σφάλμα αναπαραγωγής");
    }
  };

  const seekCurrentTrack = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !currentKey) return;
    audio.currentTime = nextTime;
    setPlayerCurrentTime(nextTime);
  };

  useEffect(() => {
    if (!initialKey) return;
    if (didAutoPlay.current) return;
    if (!items.length) return;

    const found = items.find((x) => x.key === initialKey);
    if (!found) return;

    didAutoPlay.current = true;
    togglePlay(found.key);
  }, [items, initialKey]);

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
            <div key={it.key} className="py-4">
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
                    }}
                  >
                    Λήψη
                  </button>

                  <button
                    type="button"
                    className="icon-btn icon-btn-outline"
                    aria-label="Κοινοποίηση"
                    title="Κοινοποίηση"
                    onClick={() => shareItem(it.key, it.name)}
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
              </div>
            </div>
          ))}

          <audio
            ref={audioRef}
            className="sr-only"
            preload="none"
            onPlay={() => {
              if (currentKey) setPlayingKey(currentKey);
            }}
            onPause={() => setPlayingKey(null)}
            onLoadedMetadata={(e) => setPlayerDuration(e.currentTarget.duration || 0)}
            onDurationChange={(e) => setPlayerDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setPlayerCurrentTime(e.currentTarget.currentTime || 0)}
            onEnded={() => {
              setPlayingKey(null);
              setPlayerCurrentTime(0);
            }}
          />
        </div>
      )}

      <style jsx>{`
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
